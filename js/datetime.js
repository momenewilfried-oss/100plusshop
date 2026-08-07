/**
 * Fuseau horaire Cameroun (WAT = Africa/Douala, UTC+1 toute l'année)
 */
const TZ_CAMEROUN = 'Africa/Douala';

function _toDate(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateHeureCM(value) {
  const d = _toDate(value);
  if (!d) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ_CAMEROUN,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatDateOnlyCM(value) {
  const d = _toDate(value);
  if (!d) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ_CAMEROUN,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatHeureCM(value) {
  const d = _toDate(value);
  if (!d) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ_CAMEROUN,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function todayCM() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_CAMEROUN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function debutMoisCM() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_CAMEROUN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  return `${y}-${m}-01`;
}

function maintenantLabelCM() {
  return formatDateHeureCM(new Date());
}
