"""CIS Cisco IOS compliance checks.

Contains 19 CIS benchmark rules as Python checks.
"""

from typing import Any


# Multi-framework control mappings keyed by internal rule id.
# Each entry maps the finding to:
#   - nist: NIST SP 800-53 controls
#   - iso27001: ISO/IEC 27001:2022 annex controls
#   - nciipc: NCIIPC guidelines
# Reserved mappings for rules that do not exist yet (future work):
#   Interface hardening -> CM-7 | A.8.9 | D4,D6
#   VLANs -> AC-4 | A.8.22 | D4
FRAMEWORK_MAP: dict[str, dict[str, list[str]]] = {
    # SSH v2
    "cis-3.1.1": {"nist": ["AC-17", "IA-5"], "iso27001": ["A.8.20", "A.8.21"], "nciipc": ["D3", "D4"]},
    # Password encryption
    "cis-3.2.1": {"nist": ["IA-5"], "iso27001": ["A.8.5"], "nciipc": ["D3"]},
    # Banner
    "cis-3.3.1": {"nist": ["AC-8"], "iso27001": ["A.5.10"], "nciipc": ["D3", "D12"]},
    # VTY access (transport input)
    "cis-3.4.1": {"nist": ["AC-17", "AC-3"], "iso27001": ["A.8.5", "A.5.15"], "nciipc": ["D3", "D4"]},
    # VTY exec timeout (legacy single-value check)
    "cis-3.4.2": {"nist": ["AC-11"], "iso27001": ["A.8.5"], "nciipc": ["D3"]},
    # NTP configured with authentication (legacy string check)
    "cis-3.5.1": {"nist": ["AU-8", "IA-5"], "iso27001": ["A.8.17", "A.8.5"], "nciipc": ["D7"]},
    # Logging
    "cis-3.6.1": {"nist": ["AU-12", "AU-9"], "iso27001": ["A.8.15", "A.8.16"], "nciipc": ["D7"]},
    # AAA
    "cis-3.7.1": {"nist": ["IA-2", "IA-5"], "iso27001": ["A.8.2", "A.8.5"], "nciipc": ["D3"]},
    # ACLs
    "cis-3.8.1": {"nist": ["AC-4"], "iso27001": ["A.8.3", "A.8.22"], "nciipc": ["D4"]},
    # SSH idle timeout
    "cis-3.10.1": {"nist": ["AC-17", "SC-10"], "iso27001": ["A.8.20"], "nciipc": ["D3"]},
    # VTY exec timeout (per-line list check)
    "cis-3.10.2": {"nist": ["AC-11"], "iso27001": ["A.8.5"], "nciipc": ["D3"]},
    # HTTP server disabled
    "cis-3.10.3": {"nist": ["CM-7"], "iso27001": ["A.8.9"], "nciipc": ["D4"]},
    # CDP disabled
    "cis-3.10.4": {"nist": ["CM-7"], "iso27001": ["A.8.9"], "nciipc": ["D4"]},
    # SNMP communities not default (parsed list check)
    "cis-3.10.5": {"nist": ["IA-5", "CM-7"], "iso27001": ["A.8.9", "A.8.20"], "nciipc": ["D3", "D4"]},
    # IP source routing disabled
    "cis-3.10.6": {"nist": ["CM-7"], "iso27001": ["A.8.9"], "nciipc": ["D4"]},
    # NTP server configured
    "cis-3.10.7": {"nist": ["AU-8"], "iso27001": ["A.8.17"], "nciipc": ["D7"]},
    # NTP authentication enabled
    "cis-3.10.8": {"nist": ["AU-8", "IA-5"], "iso27001": ["A.8.17", "A.8.5"], "nciipc": ["D7"]},
    # Login failure blocking
    "cis-3.10.9": {"nist": ["AC-7"], "iso27001": ["A.8.5"], "nciipc": ["D3"]},
    # Enable secret
    "cis-3.10.10": {"nist": ["IA-5"], "iso27001": ["A.8.2", "A.8.5"], "nciipc": ["D3"]},
}


def check_compliance(parsed: dict) -> list[dict[str, Any]]:
    """
    Run 19 CIS Cisco IOS compliance checks against parsed config.

    Args:
        parsed: Dictionary output from parse_cisco_ios()

    Returns:
        List of check results with rule, reference, status (PASS/FAIL), fix_command,
        and a frameworks dict mapping the finding to CIS, NIST SP 800-53,
        ISO/IEC 27001:2022, and NCIIPC control identifiers.
    """
    results = []

    # Rule 1: Ensure SSH version is set to 2
    # CIS Benchmark: 3.1.1 - Ensure SSH version is set to 2
    ssh_version = parsed.get("ssh_version")
    results.append({
        "rule": "cis-3.1.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.1.1",
        "status": "PASS" if ssh_version == "2" else "FAIL",
        "fix_command": "ip ssh version 2" if ssh_version != "2" else "",
    })

    # Rule 2: Ensure service password-encryption is enabled
    # CIS Benchmark: 3.2.1 - Ensure password encryption is enabled
    svc_pw_enc = parsed.get("service_password_encryption")
    results.append({
        "rule": "cis-3.2.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.2.1",
        "status": "PASS" if svc_pw_enc else "FAIL",
        "fix_command": "service password-encryption" if not svc_pw_enc else "",
    })

    # Rule 3: Ensure banner MOTD is configured
    # CIS Benchmark: 3.3.1 - Ensure a warning banner is configured
    banner = parsed.get("banner_motd")
    results.append({
        "rule": "cis-3.3.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.3.1",
        "status": "PASS" if banner else "FAIL",
        "fix_command": "banner motd ^C Authorized access only ^C" if not banner else "",
    })

    # Rule 4: Ensure VTY transport input is SSH only (no telnet)
    # CIS Benchmark: 3.4.1 - Ensure only SSH is allowed for remote access
    vty_transport = parsed.get("vty_transport_input") or ""
    results.append({
        "rule": "cis-3.4.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.4.1",
        "status": "PASS" if "telnet" not in vty_transport.lower() else "FAIL",
        "fix_command": "line vty 0 4\n transport input ssh" if "telnet" in vty_transport.lower() else "",
    })

    # Rule 5: Ensure VTY exec-timeout is configured (<= 10 min)
    # CIS Benchmark: 3.4.2 - Ensure idle timeout is configured
    vty_timeout = parsed.get("vty_exec_timeout")
    timeout_ok = False
    if vty_timeout:
        try:
            minutes = int(str(vty_timeout).split()[0])
            timeout_ok = minutes <= 10
        except (ValueError, IndexError, TypeError, AttributeError):
            timeout_ok = False
    results.append({
        "rule": "cis-3.4.2",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.4.2",
        "status": "PASS" if timeout_ok else "FAIL",
        "fix_command": "line vty 0 4\n exec-timeout 10 0" if not timeout_ok else "",
    })

    # Rule 6: Ensure NTP is configured with authentication
    # CIS Benchmark: 3.5.1 - Ensure NTP is configured with authentication
    # Uses the typed NTP fields so it can never contradict cis-3.10.7/3.10.8.
    ntp_server_ok = parsed.get("ntp_server_configured") is True
    ntp_auth_ok = parsed.get("ntp_auth_enabled") is True
    results.append({
        "rule": "cis-3.5.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.5.1",
        "status": "PASS" if ntp_server_ok and ntp_auth_ok else "FAIL",
        "fix_command": "ntp server <server-ip>\n ntp authenticate\n ntp authentication-key <key-id> md5 <key>" if not (ntp_server_ok and ntp_auth_ok) else "",
    })

    # Rule 7: Ensure logging is configured to syslog server
    # CIS Benchmark: 3.6.1 - Ensure logging to remote syslog server
    logging = parsed.get("logging_enabled") or ""
    results.append({
        "rule": "cis-3.6.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.6.1",
        "status": "PASS" if logging and "host" in logging.lower() else "FAIL",
        "fix_command": "logging host <syslog-ip>\n logging trap informational" if not (logging and "host" in logging.lower()) else "",
    })

    # Rule 8: Ensure AAA new-model is enabled
    # CIS Benchmark: 3.7.1 - Ensure AAA is enabled
    aaa = parsed.get("aaa_enabled")
    results.append({
        "rule": "cis-3.7.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.7.1",
        "status": "PASS" if aaa else "FAIL",
        "fix_command": "aaa new-model" if not aaa else "",
    })

    # Rule 9: Ensure no permissive ACLs (permit ip any any)
    # CIS Benchmark: 3.8.1 - Ensure no overly permissive ACLs
    acl = parsed.get("acl_permissive") or ""
    results.append({
        "rule": "cis-3.8.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.8.1",
        "status": "FAIL" if acl else "PASS",
        "fix_command": "no access-list <acl-num> permit ip any any" if acl else "",
    })

    # Rule 11: Ensure SSH idle timeout is configured (<= 60 seconds)
    # CIS Benchmark: 3.10.1 - Ensure SSH idle timeout interval is configured
    ssh_timeout = parsed.get("ssh_timeout")
    try:
        ssh_timeout_ok = ssh_timeout is not None and int(ssh_timeout) <= 60
    except (TypeError, ValueError):
        ssh_timeout_ok = False
    results.append({
        "rule": "cis-3.10.1",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.1",
        "status": "PASS" if ssh_timeout_ok else "FAIL",
        "fix_command": "ip ssh time-out 60" if not ssh_timeout_ok else "",
    })

    # Rule 12: Ensure VTY exec-timeout is configured (<= 10 min) on all vty lines
    # CIS Benchmark: 3.10.2 - Ensure idle timeout is configured for vty lines
    vty_timeouts = parsed.get("exec_timeout")
    vty_timeouts_ok = False
    if vty_timeouts:
        vty_timeouts_ok = True
        for entry in vty_timeouts:
            try:
                minutes = int(str(entry).split()[0])
            except (ValueError, IndexError):
                vty_timeouts_ok = False
                break
            if minutes > 10:
                vty_timeouts_ok = False
                break
    results.append({
        "rule": "cis-3.10.2",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.2",
        "status": "PASS" if vty_timeouts_ok else "FAIL",
        "fix_command": "line vty 0 4\n exec-timeout 5 0" if not vty_timeouts_ok else "",
    })

    # Rule 13: Ensure HTTP server is disabled
    # CIS Benchmark: 3.10.3 - Ensure HTTP server is disabled
    http_enabled = parsed.get("http_server_enabled")
    results.append({
        "rule": "cis-3.10.3",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.3",
        "status": "PASS" if http_enabled is False else "FAIL",
        "fix_command": "no ip http server" if http_enabled is not False else "",
    })

    # Rule 14: Ensure CDP is disabled globally
    # CIS Benchmark: 3.10.4 - Ensure CDP is disabled globally
    cdp_enabled = parsed.get("cdp_enabled")
    results.append({
        "rule": "cis-3.10.4",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.4",
        "status": "PASS" if cdp_enabled is False else "FAIL",
        "fix_command": "no cdp run" if cdp_enabled is not False else "",
    })

    # Rule 15: Ensure no default SNMP community strings are in use
    # CIS Benchmark: 3.10.5 - Ensure SNMP community strings are not default
    snmp_communities = parsed.get("snmp_communities")
    snmp_default_ok = False
    if snmp_communities is not None:
        snmp_default_ok = all(
            str(c).lower() not in ("public", "private") for c in snmp_communities
        )
    results.append({
        "rule": "cis-3.10.5",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.5",
        "status": "PASS" if snmp_default_ok else "FAIL",
        "fix_command": "snmp-server community <custom-string> RO" if not snmp_default_ok else "",
    })

    # Rule 16: Ensure IP source routing is disabled
    # CIS Benchmark: 3.10.6 - Ensure IP source routing is disabled
    source_route_disabled = parsed.get("source_route_disabled")
    results.append({
        "rule": "cis-3.10.6",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.6",
        "status": "PASS" if source_route_disabled is True else "FAIL",
        "fix_command": "no ip source-route" if source_route_disabled is not True else "",
    })

    # Rule 17: Ensure an NTP server is configured
    # CIS Benchmark: 3.10.7 - Ensure NTP is configured
    ntp_server = parsed.get("ntp_server_configured")
    results.append({
        "rule": "cis-3.10.7",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.7",
        "status": "PASS" if ntp_server is True else "FAIL",
        "fix_command": "ntp server in.pool.ntp.org" if ntp_server is not True else "",
    })

    # Rule 18: Ensure NTP authentication is enabled
    # CIS Benchmark: 3.10.8 - Ensure NTP authentication is enabled
    ntp_auth = parsed.get("ntp_auth_enabled")
    results.append({
        "rule": "cis-3.10.8",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.8",
        "status": "PASS" if ntp_auth is True else "FAIL",
        "fix_command": "ntp authenticate" if ntp_auth is not True else "",
    })

    # Rule 19: Ensure login failure blocking is configured
    # CIS Benchmark: 3.10.9 - Ensure login failure blocking is enabled
    login_block = parsed.get("login_block")
    results.append({
        "rule": "cis-3.10.9",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.9",
        "status": "PASS" if login_block is not None else "FAIL",
        "fix_command": "login block-for 120 attempts 3 within 60" if login_block is None else "",
    })

    # Rule 20: Ensure enable secret is used instead of enable password
    # CIS Benchmark: 3.10.10 - Ensure enable secret is used
    enable_secret = parsed.get("enable_secret_used")
    results.append({
        "rule": "cis-3.10.10",
        "reference": "CIS Cisco IOS Benchmark v1.0.0 - 3.10.10",
        "status": "PASS" if enable_secret is True else "FAIL",
        "fix_command": "enable secret <hash>" if enable_secret is not True else "",
    })

    # Attach multi-framework mappings to every result.
    for result in results:
        cis_id = result["rule"].split("-", 1)[1]
        result["frameworks"] = {
            "cis": cis_id,
            **FRAMEWORK_MAP[result["rule"]],
        }

    return results