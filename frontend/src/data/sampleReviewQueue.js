/**
 * Sample edge-case / shorthand Cisco IOS commands that would confuse
 * the deterministic TextFSM parser and get routed to SetFit classification.
 *
 * These represent the "active learning" review queue — commands that need
 * a human-in-the-loop decision to train the classifier further.
 */

export const sampleReviewQueue = [
  {
    id: 'review-001',
    rawCommand: 'logg trap informational',
    predicted: 'Logging',
    confidence: 0.824,
    timestamp: '2026-09-06T22:14:03Z',
    source: 'router-gw-01.cfg',
    status: 'pending', // pending | approved | rejected
    reviewed: false,
    assignedCategory: null,
  },
  {
    id: 'review-002',
    rawCommand: 'ena sec 5 $1$mERr$hPab1STL0MYr4cQhzR/bK0',
    predicted: 'Password Policy',
    confidence: 0.712,
    timestamp: '2026-09-06T22:14:05Z',
    source: 'router-gw-01.cfg',
    status: 'pending',
    reviewed: false,
    assignedCategory: null,
  },
  {
    id: 'review-003',
    rawCommand: 'trans in telnet',
    predicted: 'SSH Config',
    confidence: 0.681,
    timestamp: '2026-09-06T22:15:12Z',
    source: 'switch-core-02.cfg',
    status: 'pending',
    reviewed: false,
    assignedCategory: null,
  },
  {
    id: 'review-004',
    rawCommand: 'snmp com public RO 10',
    predicted: 'Access Control',
    confidence: 0.784,
    timestamp: '2026-09-06T22:15:14Z',
    source: 'switch-core-02.cfg',
    status: 'pending',
    reviewed: false,
    assignedCategory: null,
  },
  {
    id: 'review-005',
    rawCommand: 'ip dom-name corp.local',
    predicted: 'Interface',
    confidence: 0.593,
    timestamp: '2026-09-06T22:16:30Z',
    source: 'fw-dmz-01.cfg',
    status: 'approved',
    reviewed: true,
    assignedCategory: 'Interface',
  },
  {
    id: 'review-006',
    rawCommand: 'aaa authen login def local',
    predicted: 'AAA',
    confidence: 0.841,
    timestamp: '2026-09-06T22:16:32Z',
    source: 'fw-dmz-01.cfg',
    status: 'approved',
    reviewed: true,
    assignedCategory: 'AAA',
  },
];
