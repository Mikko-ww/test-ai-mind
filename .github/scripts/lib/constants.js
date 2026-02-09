// Phase constants
const PHASE_LABELS = {
  REQUIREMENT: 'agent:phase:requirement',
  SPEC: 'agent:phase:spec',
  PLAN: 'agent:phase:plan'
};

const PHASES = ['requirement', 'spec', 'plan', 'execution'];

const PHASE_EMOJIS = {
  requirement: '📋',
  spec: '📐',
  plan: '🗺️',
  execution: '⚙️'
};

const PHASE_DISPLAY_NAMES = {
  requirement: '需求文档',
  spec: '规格说明',
  plan: '执行计划',
  execution: '任务执行'
};

module.exports = {
  PHASE_LABELS,
  PHASES,
  PHASE_EMOJIS,
  PHASE_DISPLAY_NAMES
};
