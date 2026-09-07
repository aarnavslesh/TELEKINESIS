"""Cisco IOS configuration parser using TextFSM with regex fallbacks.

parse_cisco_ios() runs the TextFSM template in templates/cisco_ios.template as a
first structured pass, then Python helpers fill any gaps and compute typed
values (booleans, lists, negation-aware state) that a flat TextFSM template
cannot express reliably.
"""

import re
from pathlib import Path

import textfsm

from typing import Optional


# TextFSM template file path (kept next to this module so the parser works no
# matter which directory it is launched from).
TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "cisco_ios.template"


def _parse_with_textfsm(config_text: str) -> dict:
    """Run the TextFSM template and return the first record keyed by header name.

    Returns an empty dict when the template is missing, cannot be compiled, or
    produces no records, so callers always have a uniform structure to fall
    back from.
    """
    try:
        with TEMPLATE_PATH.open(encoding="utf-8") as template_file:
            fsm = textfsm.TextFSM(template_file)
    except Exception:
        return {}

    try:
        rows = fsm.ParseText(config_text)
    except Exception:
        return {}

    if not rows:
        return {}

    row = rows[0]
    return {
        header: row[index]
        for index, header in enumerate(fsm.header)
        if index < len(row)
    }


def parse_cisco_ios(config_text: str) -> dict:
    """
    Parse a Cisco IOS configuration and extract security-relevant fields.

    Args:
        config_text: Raw Cisco IOS configuration text

    Returns:
        Dictionary with extracted fields. Old fields keep their historical
        semantics (None when missing). New fields are typed:
        - ssh_timeout: int seconds or None
        - exec_timeout: list of "min sec" strings (one per vty exec-timeout)
        - http_server_enabled / cdp_enabled / source_route_disabled /
          ntp_server_configured / ntp_auth_enabled / enable_secret_used: bool
        - snmp_communities: list of community names
        - vty_acl: list of ACL identifiers applied inbound on vty lines
        - login_block: dict {block_for, attempts, within} or None
    """
    tfsm = _parse_with_textfsm(config_text)

    result = {
        # --- legacy fields (same keys and semantics as before) ---
        "hostname": _pick(config_text, tfsm, "hostname", _extract_hostname),
        "ssh_version": _pick(config_text, tfsm, "ssh_version", _extract_ssh_version),
        "service_password_encryption": _pick(
            config_text, tfsm, "service_password_encryption",
            _extract_service_password_encryption,
        ),
        "banner_motd": _pick(config_text, tfsm, "banner_motd", _extract_banner_motd),
        "vty_transport_input": _pick(
            config_text, tfsm, "vty_transport_input", _extract_vty_transport_input
        ),
        "vty_exec_timeout": _pick(
            config_text, tfsm, "vty_exec_timeout", _extract_vty_exec_timeout
        ),
        "ntp_configured": _pick(config_text, tfsm, "ntp_configured", _extract_ntp_configured),
        "logging_enabled": _pick(config_text, tfsm, "logging_enabled", _extract_logging_enabled),
        "aaa_enabled": _pick(config_text, tfsm, "aaa_enabled", _extract_aaa_enabled),
        "acl_permissive": _pick(config_text, tfsm, "acl_permissive", _extract_acl_permissive),
        # --- new fields ---
        "ssh_timeout": _pick_int(config_text, tfsm, "ssh_timeout", _extract_ssh_timeout),
        "exec_timeout": _extract_exec_timeout(config_text),
        "http_server_enabled": _extract_http_server_enabled(config_text),
        "cdp_enabled": _extract_cdp_enabled(config_text),
        "snmp_communities": _extract_snmp_communities(config_text),
        "source_route_disabled": _extract_source_route_disabled(config_text),
        "ntp_server_configured": _extract_ntp_server_configured(config_text),
        "ntp_auth_enabled": _extract_ntp_auth_enabled(config_text),
        "vty_acl": _extract_vty_acl(config_text),
        "login_block": _extract_login_block(config_text),
        "enable_secret_used": _extract_enable_secret_used(config_text),
    }
    return result


def _pick(config_text: str, tfsm: dict, key: str, extractor):
    """Prefer the regex helper result; fall back to the TextFSM capture."""
    value = extractor(config_text)
    if value is None and tfsm.get(key):
        return tfsm[key]
    return value


def _pick_int(config_text: str, tfsm: dict, key: str, extractor) -> Optional[int]:
    """Like _pick but converts the TextFSM capture to an integer."""
    value = extractor(config_text)
    if value is None:
        raw = tfsm.get(key)
        if raw:
            try:
                return int(raw)
            except (TypeError, ValueError):
                return None
    return value



# ---------------------------------------------------------------------------
# Legacy field extractors (unchanged semantics)
# ---------------------------------------------------------------------------


def _extract_hostname(config_text: str) -> Optional[str]:
    match = re.search(r"^hostname\s+(\S+)", config_text, re.MULTILINE)
    return match.group(1) if match else None


def _extract_ssh_version(config_text: str) -> Optional[str]:
    match = re.search(r"^ip ssh version\s+(\S+)", config_text, re.MULTILINE)
    return match.group(1) if match else None


def _extract_service_password_encryption(config_text: str) -> Optional[str]:
    match = re.search(r"^service password-encryption", config_text, re.MULTILINE)
    return "service password-encryption" if match else None


def _extract_banner_motd(config_text: str) -> Optional[str]:
    match = re.search(
        r"^banner motd\s+(.+?)(?:\n\S|\Z)", config_text, re.MULTILINE | re.DOTALL
    )
    return match.group(1).strip() if match else None


def _extract_vty_transport_input(config_text: str) -> Optional[str]:
    """Full `transport input ...` values from ALL `line vty` sections.

    Lines are newline-joined so the compliance check can substring-scan for
    banned protocols (e.g. telnet) across every vty block, not just the first,
    and so `transport input ssh telnet` is captured in full instead of just
    its first token.
    """
    values = [
        line[len("transport input"):].strip()
        for line in _iter_vty_subcommands(config_text)
        if line.startswith("transport input")
    ]
    return "\n".join(values) if values else None


def _extract_vty_exec_timeout(config_text: str) -> Optional[str]:
    """First exec-timeout across ALL vty sections (legacy single-value field)."""
    timeouts = _extract_exec_timeout(config_text)
    return timeouts[0] if timeouts else None


def _extract_ntp_configured(config_text: str) -> Optional[str]:
    match = re.search(r"^ntp\s+(server|peer|source)\s+(\S+)", config_text, re.MULTILINE)
    return f"ntp {match.group(1)} {match.group(2)}" if match else None


def _extract_logging_enabled(config_text: str) -> Optional[str]:
    """Modern `logging host <server>` and legacy `logging <ip>` (no host
    keyword) both mean remote syslog; normalize both to a host string."""
    match = re.search(r"^logging\s+host\s+(\S+)", config_text, re.MULTILINE)
    if match:
        return f"logging host {match.group(1)}"
    match = re.search(
        r"^logging\s+(\d{1,3}(?:\.\d{1,3}){3})", config_text, re.MULTILINE
    )
    if match:
        return f"logging host {match.group(1)}"
    return None


def _extract_aaa_enabled(config_text: str) -> Optional[str]:
    match = re.search(r"^aaa new-model", config_text, re.MULTILINE)
    return "aaa new-model" if match else None


def _extract_acl_permissive(config_text: str) -> Optional[str]:
    # Matches the numbered-ACL form at column zero and the indented subcommand
    # form inside named ACLs (e.g. `ip access-list extended NAME`).
    match = re.search(
        r"^access-list\s+\d+\s+permit\s+ip\s+any\s+any"
        r"|^\s+permit\s+ip\s+any\s+any",
        config_text,
        re.MULTILINE,
    )
    return match.group(0).strip() if match else None


# ---------------------------------------------------------------------------
# New field extractors
# ---------------------------------------------------------------------------


def _extract_ssh_timeout(config_text: str) -> Optional[int]:
    match = re.search(r"^ip ssh time-out\s+(\d+)", config_text, re.MULTILINE)
    return int(match.group(1)) if match else None


def _iter_vty_subcommands(config_text: str):
    """Yield lines that belong to a `line vty ...` section."""
    inside_vty = False
    for raw_line in config_text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("!"):
            continue
        # Subcommands are indented; top-level commands start at column zero.
        if raw_line[0] in (" ", "\t"):
            if inside_vty:
                yield raw_line.strip()
            continue
        inside_vty = raw_line.lstrip().startswith("line vty")


def _extract_exec_timeout(config_text: str) -> list[str]:
    """List of 'min sec' strings from exec-timeout on vty lines."""
    timeouts = []
    for line in _iter_vty_subcommands(config_text):
        match = re.search(r"^exec-timeout\s+(\d+)\s+(\d+)", line)
        if match:
            timeouts.append(f"{match.group(1)} {match.group(2)}")
    return timeouts


def _state_after_toggles(config_text: str, on_re: str, off_re: str) -> bool:
    """Return the final on/off state after processing lines in order."""
    state = False
    for raw_line in config_text.splitlines():
        line = raw_line.strip()
        if re.search(off_re, line):
            state = False
        elif re.search(on_re, line):
            state = True
    return state


def _extract_http_server_enabled(config_text: str) -> bool:
    return _state_after_toggles(
        config_text,
        on_re=r"^ip http (secure-)?server",
        off_re=r"^no ip http (secure-)?server",
    )


def _extract_cdp_enabled(config_text: str) -> bool:
    return _state_after_toggles(config_text, on_re=r"^cdp run", off_re=r"^no cdp run")


def _extract_snmp_communities(config_text: str) -> list[str]:
    communities = []
    for match in re.finditer(
        r"^snmp-server community\s+(\S+)", config_text, re.MULTILINE
    ):
        communities.append(match.group(1))
    return communities


def _extract_source_route_disabled(config_text: str) -> bool:
    return _state_after_toggles(
        config_text,
        on_re=r"^no ip source-route",
        off_re=r"^ip source-route",
    )


def _extract_ntp_server_configured(config_text: str) -> bool:
    return _state_after_toggles(
        config_text, on_re=r"^ntp server\s+", off_re=r"^no ntp server\s+"
    )


def _extract_ntp_auth_enabled(config_text: str) -> bool:
    return _state_after_toggles(
        config_text,
        on_re=r"^ntp authenticate\b",
        off_re=r"^no ntp authenticate\b",
    )


def _extract_vty_acl(config_text: str) -> list[str]:
    """ACL identifiers applied with `access-class <id> in` on vty lines."""
    acls = []
    for line in _iter_vty_subcommands(config_text):
        match = re.search(r"^access-class\s+(\S+)\s+in\b", line)
        if match:
            acls.append(match.group(1))
    return acls


def _extract_login_block(config_text: str) -> Optional[dict]:
    match = re.search(
        r"^login block-for\s+(\d+)\s+attempts\s+(\d+)\s+within\s+(\d+)",
        config_text,
        re.MULTILINE,
    )
    if not match:
        return None
    return {
        "block_for": int(match.group(1)),
        "attempts": int(match.group(2)),
        "within": int(match.group(3)),
    }


def _extract_enable_secret_used(config_text: str) -> bool:
    """True when `enable secret` is active (enable secret overrides password)."""
    return _state_after_toggles(
        config_text,
        on_re=r"^enable secret\b",
        off_re=r"^no enable secret\b",
    )
