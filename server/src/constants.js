// Single source of truth for the kondisi_rumah taxonomy. Referenced by the
// schema CHECK constraint, request validators, the scoring weights, and the
// VLM classifier so the three values never drift independently.
const KONDISI_RUMAH = ['Layak', 'Kurang Layak', 'Tidak Layak'];

module.exports = { KONDISI_RUMAH };
