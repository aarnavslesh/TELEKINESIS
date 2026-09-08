/**
 * Realistic Cisco IOS CIS / STIG benchmark sample data.
 * Used to populate the audit dashboard immediately on load.
 */

export const sampleAuditResults = [
  {
    id: 'rule-001',
    status: 'fail',
    cliCode: 'no service password-encryption',
    ruleId: 'CIS 1.2',
    ruleTitle: 'Enable Secret Encryption',
    remediation: 'Enable Type 7 password encryption on all line passwords.',
    violationDetail:
      'Password encryption is disabled. All passwords stored in the running configuration are in plaintext and can be read by anyone with access to the config file or SNMP community strings.',
    fixCli: 'service password-encryption',
    rollbackCli: 'no service password-encryption',
    confidence: 0.97,
    category: 'Password Policy',
  },
  {
    id: 'rule-002',
    status: 'fail',
    cliCode: 'transport input telnet',
    ruleId: 'CIS 2.1.1',
    ruleTitle: 'Disable Telnet on VTY Lines',
    remediation: 'Replace Telnet with SSH as the only allowed transport input.',
    violationDetail:
      'Telnet transmits credentials in cleartext over the network. Any attacker with network sniffing capability can capture login credentials for vty line access.',
    fixCli: 'line vty 0 4\n transport input ssh',
    rollbackCli: 'line vty 0 4\n transport input telnet',
    confidence: 0.99,
    category: 'SSH Config',
  },
  {
    id: 'rule-003',
    status: 'pass',
    cliCode: 'ip ssh version 2',
    ruleId: 'CIS 2.1.2',
    ruleTitle: 'Enforce SSH Version 2',
    remediation: 'Already compliant — SSH version 2 is enforced.',
    violationDetail: null,
    fixCli: 'ip ssh version 2',
    rollbackCli: 'no ip ssh version 2',
    confidence: 0.98,
    category: 'SSH Config',
  },
  {
    id: 'rule-004',
    status: 'fail',
    cliCode: 'snmp-server community public RO',
    ruleId: 'CIS 3.3.1',
    ruleTitle: 'Change Default SNMP Community Strings',
    remediation: 'Replace default "public" community string with a complex, non-guessable value.',
    violationDetail:
      'The default SNMP community string "public" is in use. This is a well-known default that allows any SNMP management station to read device configuration data including interface stats, routing tables, and ARP caches.',
    fixCli: 'no snmp-server community public RO\nsnmp-server community <COMPLEX_STRING> RO <ACL>',
    rollbackCli: 'snmp-server community public RO',
    confidence: 0.95,
    category: 'Access Control',
  },
  {
    id: 'rule-005',
    status: 'pass',
    cliCode: 'logging buffered 16384 informational',
    ruleId: 'CIS 5.2',
    ruleTitle: 'Enable Buffered Logging',
    remediation: 'Already compliant — buffered logging is enabled at informational level.',
    violationDetail: null,
    fixCli: 'logging buffered 16384 informational',
    rollbackCli: 'no logging buffered',
    confidence: 0.91,
    category: 'Logging',
  },
  {
    id: 'rule-006',
    status: 'fail',
    cliCode: 'no aaa new-model',
    ruleId: 'CIS 4.1',
    ruleTitle: 'Enable AAA Authentication',
    remediation: 'Enable AAA new-model and configure TACACS+ or RADIUS authentication.',
    violationDetail:
      'AAA (Authentication, Authorization, and Accounting) is disabled. Without AAA, the device relies on local line passwords which cannot enforce granular user-level access control, logging, or multi-factor authentication.',
    fixCli: 'aaa new-model\naaa authentication login default local',
    rollbackCli: 'no aaa new-model',
    confidence: 0.93,
    category: 'AAA',
  },
  {
    id: 'rule-007',
    status: 'warn',
    cliCode: 'no banner login',
    ruleId: 'CIS 1.5.1',
    ruleTitle: 'Set Login Banner',
    remediation: 'Configure a legal warning banner for all login sessions.',
    violationDetail:
      'No login banner is configured. In many jurisdictions, the absence of a warning banner may limit legal prosecution of unauthorized access attempts.',
    fixCli: 'banner login ^C\nAuthorized access only. All activity is monitored and logged.\n^C',
    rollbackCli: 'no banner login',
    confidence: 0.88,
    category: 'Banner',
  },
  {
    id: 'rule-008',
    status: 'pass',
    cliCode: 'ntp server 10.0.0.1',
    ruleId: 'CIS 5.3',
    ruleTitle: 'Configure NTP Server',
    remediation: 'Already compliant — NTP server is configured.',
    violationDetail: null,
    fixCli: 'ntp server 10.0.0.1',
    rollbackCli: 'no ntp server 10.0.0.1',
    confidence: 0.96,
    category: 'NTP',
  },
  {
    id: 'rule-009',
    status: 'fail',
    cliCode: 'enable password cisco123',
    ruleId: 'CIS 1.1',
    ruleTitle: 'Use Enable Secret Instead of Enable Password',
    remediation: 'Replace enable password with enable secret for MD5-hashed storage.',
    violationDetail:
      'The "enable password" command stores the privileged EXEC password using weak Type 7 reversible encryption (or plaintext). An attacker can trivially decode Type 7 passwords using publicly available tools.',
    fixCli: 'no enable password\nenable secret <STRONG_PASSWORD>',
    rollbackCli: 'enable password cisco123',
    confidence: 0.99,
    category: 'Password Policy',
  },
  {
    id: 'rule-010',
    status: 'pass',
    cliCode: 'logg trap informational',
    ruleId: 'CIS 5.1',
    ruleTitle: 'Set Logging Trap Level',
    remediation: 'Already compliant — syslog trap level set to informational.',
    violationDetail: null,
    fixCli: 'logging trap informational',
    rollbackCli: 'no logging trap',
    confidence: 0.824,
    category: 'Logging',
    isAiFallback: true,
    activeLearningTargetId: 'review-001',
  },
];

/**
 * Sample active-learning flagged prediction (low-confidence)
 */
export const samplePendingReview = {
  command: 'logg trap informational',
  predicted: 'Logging',
  confidence: 0.824,
  alternatives: ['SSH Config', 'NTP', 'Access Control'],
  activeLearningTargetId: 'review-001',
};

/**
 * Demo Scenario Cisco IOS Config (Vulnerable Benchmark)
 */
export const demoCiscoConfig = `! Cisco IOS Software, C3750 Software (C3750-IPSERVICESK9-M), Version 15.2(4)M
! Technical Evaluation: SIH-26155 Defense Enclave Audit
hostname CORE-SW-01
!
no service password-encryption
!
enable secret 5 $1$mERr$hPab1STL0MYr4cQhzR/bK0
!
ip domain-name defense.enclave.local
ip ssh version 2
!
snmp-server community public RO
!
no aaa new-model
!
no banner login
!
ntp server 10.0.0.1 prefer
!
ip http server
no ip http secure-server
!
logg trap informational
!
line con 0
 exec-timeout 15 0
line vty 0 4
 transport input telnet
 login
!
end`;

/**
 * Demo Scenario Evaluation Results with Intentional Vulnerabilities
 */
export const demoScenarioResults = [
  {
    id: 'demo-001',
    status: 'fail',
    cliCode: 'transport input telnet',
    ruleId: 'CIS 2.1.1',
    ruleTitle: 'Disable Telnet on VTY Lines',
    severity: 'Critical',
    remediation: 'Replace Telnet with SSH as the only allowed transport input.',
    violationDetail: 'Telnet transmits credentials in cleartext across the air-gapped subnet.',
    fixCli: 'line vty 0 4\n transport input ssh',
    rollbackCli: 'line vty 0 4\n transport input telnet',
    confidence: 0.99,
    category: 'SSH Config',
  },
  {
    id: 'demo-002',
    status: 'fail',
    cliCode: 'no service password-encryption',
    ruleId: 'CIS 1.2',
    ruleTitle: 'Enable Secret Encryption',
    severity: 'High',
    remediation: 'Enable Type 7 password encryption on all line passwords.',
    violationDetail: 'Running config stores line passwords in plaintext.',
    fixCli: 'service password-encryption',
    rollbackCli: 'no service password-encryption',
    confidence: 0.97,
    category: 'Password Policy',
  },
  {
    id: 'demo-003',
    status: 'fail',
    cliCode: 'snmp-server community public RO',
    ruleId: 'CIS 3.3.1',
    ruleTitle: 'Change Default SNMP Community Strings',
    severity: 'High',
    remediation: 'Replace default "public" community string with a complex value and ACL.',
    violationDetail: 'Default "public" SNMP string allows any internal IP to query device MIBs.',
    fixCli: 'no snmp-server community public RO\nsnmp-server community SEC_COMM_981 RO 10',
    rollbackCli: 'snmp-server community public RO',
    confidence: 0.95,
    category: 'Access Control',
  },
  {
    id: 'demo-004',
    status: 'warn',
    cliCode: 'no banner login',
    ruleId: 'CIS 1.5.1',
    ruleTitle: 'Set Legal Login Warning Banner',
    severity: 'Medium',
    remediation: 'Configure a legal warning banner stating unauthorized access is prosecuted.',
    violationDetail: 'No legal consent banner presented before authentication prompt.',
    fixCli: 'banner login ^C\nRESTRICTED DEFENSE SYSTEM - AUTHORIZED ACCESS ONLY\n^C',
    rollbackCli: 'no banner login',
    confidence: 0.88,
    category: 'Banner',
  },
  {
    id: 'demo-005',
    status: 'fail',
    cliCode: 'ip http server',
    ruleId: 'CIS 2.2.1',
    ruleTitle: 'Disable HTTP Web Management',
    severity: 'High',
    remediation: 'Disable unencrypted HTTP server and enable HTTPS.',
    violationDetail: 'Plaintext HTTP server active on TCP port 80.',
    fixCli: 'no ip http server\nip http secure-server',
    rollbackCli: 'ip http server',
    confidence: 0.96,
    category: 'Access Control',
  },
  {
    id: 'demo-006',
    status: 'pass',
    cliCode: 'ip ssh version 2',
    ruleId: 'CIS 2.1.2',
    ruleTitle: 'Enforce SSH Version 2',
    severity: 'Medium',
    remediation: 'Already compliant — SSHv2 enforced with RSA 2048-bit keys.',
    violationDetail: null,
    fixCli: 'ip ssh version 2',
    rollbackCli: 'no ip ssh version 2',
    confidence: 0.98,
    category: 'SSH Config',
  },
  {
    id: 'demo-007',
    status: 'pass',
    cliCode: 'ntp server 10.0.0.1 prefer',
    ruleId: 'CIS 5.3.1',
    ruleTitle: 'NTP Time Synchronization',
    severity: 'Medium',
    remediation: 'Already compliant — internal stratum-2 NTP server synchronized.',
    violationDetail: null,
    fixCli: 'ntp server 10.0.0.1 prefer',
    rollbackCli: 'no ntp server 10.0.0.1',
    confidence: 0.95,
    category: 'NTP',
  },
  {
    id: 'demo-008',
    status: 'pass',
    cliCode: 'enable secret 5 $1$mERr$hPab1STL...',
    ruleId: 'CIS 1.1',
    ruleTitle: 'Enforce Enable Secret MD5 Hash',
    severity: 'High',
    remediation: 'Already compliant — privileged EXEC mode uses salted secret hash.',
    violationDetail: null,
    fixCli: 'enable secret 5 ...',
    rollbackCli: 'no enable secret',
    confidence: 0.94,
    category: 'Password Policy',
  },
  {
    id: 'demo-009',
    status: 'pass',
    cliCode: 'logging buffered 16384 informational',
    ruleId: 'CIS 5.2',
    ruleTitle: 'Enable Buffered Logging',
    severity: 'Low',
    remediation: 'Already compliant — 16KB circular logging buffer allocated.',
    violationDetail: null,
    fixCli: 'logging buffered 16384 informational',
    rollbackCli: 'no logging buffered',
    confidence: 0.91,
    category: 'Logging',
  },
  {
    id: 'demo-010',
    status: 'pass',
    cliCode: 'logg trap informational',
    ruleId: 'CIS 5.1',
    ruleTitle: 'Set Syslog Trap Level',
    severity: 'Medium',
    remediation: 'Already compliant — syslog trap level set to informational.',
    violationDetail: null,
    fixCli: 'logging trap informational',
    rollbackCli: 'no logging trap',
    confidence: 0.824,
    category: 'Logging',
    isAiFallback: true,
    activeLearningTargetId: 'review-001',
  },
];

export const demoScenarioStats = {
  total: 10,
  passed: 5,
  failed: 4,
  warnings: 1,
  pending: 1,
  score: 73,
  stigScore: 68,
  dualScore: true,
};

/**
 * Compute summary stats from audit results
 */
export function computeAuditStats(results) {
  const norm = (s) => String(s ?? '').toUpperCase();
  const total = results.length;
  const passed = results.filter((r) => norm(r.status) === 'PASS').length;
  const failed = results.filter((r) => norm(r.status) === 'FAIL').length;
  const warnings = results.filter((r) => norm(r.status) === 'WARN').length;
  const pending = results.filter(
    (r) => typeof r.confidence === 'number' && r.confidence < 0.85
  ).length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, failed, warnings, pending, score };
}
