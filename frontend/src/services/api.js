/**
 * API client for the NetGuardian & SetFit backend.
 *
 * Direct target: http://127.0.0.1:8000
 * Falls back to mock heuristics if backend is offline.
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/** Known classifier categories for fallback mock */
const CATEGORIES = [
  'SSH Config',
  'Password Policy',
  'Access Control',
  'Logging',
  'Banner',
  'Interface',
  'NTP',
  'AAA',
  'VLAN',
];

/**
 * Keyword-based mock classifier used only when backend is unreachable.
 */
function mockPredict(command) {
  const lower = command.toLowerCase();

  const rules = [
    { keywords: ['ssh', 'crypto', 'ip ssh'], category: 'SSH Config' },
    { keywords: ['password', 'secret', 'enable', 'ena sec'], category: 'Password Policy' },
    { keywords: ['access', 'acl', 'permit', 'deny', 'snmp'], category: 'Access Control' },
    { keywords: ['log', 'logg', 'syslog', 'trap'], category: 'Logging' },
    { keywords: ['banner'], category: 'Banner' },
    { keywords: ['interface', 'vlan', 'switchport'], category: 'Interface' },
    { keywords: ['ntp', 'clock'], category: 'NTP' },
    { keywords: ['aaa', 'tacacs', 'radius', 'authentication'], category: 'AAA' },
    { keywords: ['vlan', 'trunk'], category: 'VLAN' },
    { keywords: ['transport', 'telnet', 'line vty'], category: 'SSH Config' },
    { keywords: ['domain', 'dom-name', 'ip domain'], category: 'Interface' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      const confidence = 0.55 + Math.random() * 0.25;
      return {
        category: rule.category,
        confidence: parseFloat(confidence.toFixed(4)),
      };
    }
  }

  const idx = Math.floor(Math.random() * CATEGORIES.length);
  return {
    category: CATEGORIES[idx],
    confidence: parseFloat((0.3 + Math.random() * 0.2).toFixed(4)),
  };
}

/**
 * Send a command to the SetFit /predict endpoint.
 */
export async function predictCommand(command) {
  const startTime = performance.now();

  try {
    const response = await fetch(`${BACKEND_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([command]),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) {
      throw new Error('Empty classification response');
    }
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      category: first.predicted_label,
      confidence: first.confidence,
      latencyMs,
      isLive: true,
    };
  } catch (err) {
    const mockResult = mockPredict(command);
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      ...mockResult,
      latencyMs,
      isLive: false,
    };
  }
}

/**
 * Upload a raw Cisco .txt config file to the compliance auditor.
 */
export async function uploadConfigFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Upload failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch past audit runs stored in SQLite.
 */
export async function fetchAuditHistory() {
  const response = await fetch(`${BACKEND_URL}/uploads`);
  if (!response.ok) {
    throw new Error('Failed to retrieve audit history');
  }
  return await response.json();
}

/**
 * Check if the backend is reachable.
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all pending AI-classification reviews from the backend.
 */
export async function fetchPendingReviews() {
  const response = await fetch(`${BACKEND_URL}/pending-reviews`);
  if (!response.ok) {
    throw new Error('Failed to fetch pending reviews');
  }
  return await response.json();
}

/**
 * Resolve a pending review: action = 'approve' | 'reject' | 'relabel'.
 */
export async function resolvePendingReview(id, action, newLabel = null) {
  const body = { action };
  if (action === 'relabel' && newLabel) body.new_label = newLabel;
  const response = await fetch(`${BACKEND_URL}/pending-reviews/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Resolve failed with status ${response.status}`);
  }
  return await response.json();
}

export { CATEGORIES };