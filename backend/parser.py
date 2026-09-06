"""Cisco IOS configuration parser using TextFSM with regex fallbacks."""

import re
import textfsm
from typing import Optional


# TextFSM template for Cisco IOS config parsing
CISCO_IOS_TEMPLATE = r"""
Value hostname (\S+)
Value ssh_version (\S+)
Value service_password_encryption (service password-encryption)
Value banner_motd (banner motd.*)
Value vty_transport_input (transport input.*)
Value vty_exec_timeout (exec-timeout.*)
Value ntp_configured (ntp.*)
Value logging_enabled (logging.*)
Value aaa_enabled (aaa new-model)
Value acl_permissive (access-list.*permit.*any)

Start
  ^hostname\s+${hostname}
  ^ip ssh version\s+${ssh_version}
  ^${service_password_encryption}
  ^${banner_motd}
  ^ transport input\s+${vty_transport_input}
  ^ exec-timeout\s+${vty_exec_timeout}
  ^${ntp_configured}
  ^${logging_enabled}
  ^${aaa_enabled}
  ^${acl_permissive}
  ^.* -> Start
"""


def parse_cisco_ios(config_text: str) -> dict:
    """
    Parse a Cisco IOS configuration and extract security-relevant fields.

    Args:
        config_text: Raw Cisco IOS configuration text

    Returns:
        Dictionary with extracted fields (None for missing fields)
    """
    result = {
        "hostname": None,
        "ssh_version": None,
        "service_password_encryption": None,
        "banner_motd": None,
        "vty_transport_input": None,
        "vty_exec_timeout": None,
        "ntp_configured": None,
        "logging_enabled": None,
        "aaa_enabled": None,
        "acl_permissive": None,
    }

    # Try TextFSM first
    try:
        template = textfsm.TextFSM(StringIO(CISCO_IOS_TEMPLATE))
        parsed = template.ParseText(config_text)
        if parsed:
            row = parsed[0]
            result["hostname"] = row[0] if row[0] else None
            result["ssh_version"] = row[1] if row[1] else None
            result["service_password_encryption"] = row[2] if row[2] else None
            result["banner_motd"] = row[3] if row[3] else None
            result["vty_transport_input"] = row[4] if row[4] else None
            result["vty_exec_timeout"] = row[5] if row[5] else None
            result["ntp_configured"] = row[6] if row[6] else None
            result["logging_enabled"] = row[7] if row[7] else None
            result["aaa_enabled"] = row[8] if row[8] else None
            result["acl_permissive"] = row[9] if row[9] else None
    except Exception:
        pass  # Fall back to regex

    # Regex fallbacks for fields TextFSM might miss
    result["hostname"] = result["hostname"] or _extract_hostname(config_text)
    result["ssh_version"] = result["ssh_version"] or _extract_ssh_version(config_text)
    result["service_password_encryption"] = result["service_password_encryption"] or _extract_service_password_encryption(config_text)
    result["banner_motd"] = result["banner_motd"] or _extract_banner_motd(config_text)
    result["vty_transport_input"] = result["vty_transport_input"] or _extract_vty_transport_input(config_text)
    result["vty_exec_timeout"] = result["vty_exec_timeout"] or _extract_vty_exec_timeout(config_text)
    result["ntp_configured"] = result["ntp_configured"] or _extract_ntp_configured(config_text)
    result["logging_enabled"] = result["logging_enabled"] or _extract_logging_enabled(config_text)
    result["aaa_enabled"] = result["aaa_enabled"] or _extract_aaa_enabled(config_text)
    result["acl_permissive"] = result["acl_permissive"] or _extract_acl_permissive(config_text)

    return result


def _extract_hostname(config_text: str) -> Optional[str]:
    match = re.search(r'^hostname\s+(\S+)', config_text, re.MULTILINE)
    return match.group(1) if match else None


def _extract_ssh_version(config_text: str) -> Optional[str]:
    match = re.search(r'^ip ssh version\s+(\d+)', config_text, re.MULTILINE)
    return match.group(1) if match else None


def _extract_service_password_encryption(config_text: str) -> Optional[str]:
    match = re.search(r'^service password-encryption', config_text, re.MULTILINE)
    return "service password-encryption" if match else None


def _extract_banner_motd(config_text: str) -> Optional[str]:
    match = re.search(r'^banner motd\s+(.+?)(?:\n\S|\Z)', config_text, re.MULTILINE | re.DOTALL)
    return match.group(1).strip() if match else None


def _extract_vty_transport_input(config_text: str) -> Optional[str]:
    match = re.search(r'^line vty\s+\d+\s+\d+.*?^ transport input\s+(\S+)', config_text, re.MULTILINE | re.DOTALL)
    return match.group(1) if match else None


def _extract_vty_exec_timeout(config_text: str) -> Optional[str]:
    match = re.search(r'^line vty\s+\d+\s+\d+.*?^ exec-timeout\s+(\d+\s+\d+)', config_text, re.MULTILINE | re.DOTALL)
    return match.group(1) if match else None


def _extract_ntp_configured(config_text: str) -> Optional[str]:
    match = re.search(r'^ntp\s+(server|peer|source)\s+(\S+)', config_text, re.MULTILINE)
    return f"ntp {match.group(1)} {match.group(2)}" if match else None


def _extract_logging_enabled(config_text: str) -> Optional[str]:
    match = re.search(r'^logging\s+(\S+)', config_text, re.MULTILINE)
    return f"logging {match.group(1)}" if match else None


def _extract_aaa_enabled(config_text: str) -> Optional[str]:
    match = re.search(r'^aaa new-model', config_text, re.MULTILINE)
    return "aaa new-model" if match else None


def _extract_acl_permissive(config_text: str) -> Optional[str]:
    match = re.search(r'^access-list\s+\d+\s+permit\s+ip\s+any\s+any', config_text, re.MULTILINE)
    return match.group(0) if match else None


from io import StringIO