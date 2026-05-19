import { createLogger } from '../logger/index.js';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface RepairIssue {
  file: string;
  field: string;
  severity: IssueSeverity;
  message: string;
  autoFix?: string;
}

const log = createLogger('repair-report');

export class RepairReport {
  private readonly issues: RepairIssue[] = [];

  addIssue(
    file: string,
    field: string,
    severity: IssueSeverity,
    message: string,
    autoFix?: string,
  ): void {
    const issue: RepairIssue = { file, field, severity, message };
    if (autoFix !== undefined) issue.autoFix = autoFix;
    this.issues.push(issue);
    const logData = { file, field, message, ...(autoFix ? { autoFix } : {}) };
    if (severity === 'error') log.error('validation error', logData);
    else if (severity === 'warning') log.warn('validation warning', logData);
    else log.info('validation info', logData);
  }

  hasErrors(): boolean {
    return this.issues.some((i) => i.severity === 'error');
  }

  getIssues(): readonly RepairIssue[] {
    return this.issues;
  }

  count(severity?: IssueSeverity): number {
    if (!severity) return this.issues.length;
    return this.issues.filter((i) => i.severity === severity).length;
  }

  format(): string {
    if (this.issues.length === 0) return 'No issues found.';

    const errors = this.issues.filter((i) => i.severity === 'error');
    const warnings = this.issues.filter((i) => i.severity === 'warning');
    const infos = this.issues.filter((i) => i.severity === 'info');

    const lines: string[] = [
      `Campaign Repair Report: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
      '',
    ];

    const formatSection = (label: string, items: RepairIssue[]) => {
      if (items.length === 0) return;
      lines.push(`── ${label} ──`);
      for (const i of items) {
        lines.push(`  [${i.file}] ${i.field}: ${i.message}`);
        if (i.autoFix) lines.push(`    → auto-fix: ${i.autoFix}`);
      }
      lines.push('');
    };

    formatSection('ERRORS (block loading)', errors);
    formatSection('WARNINGS (auto-fixable)', warnings);
    formatSection('INFO (suggestions)', infos);

    return lines.join('\n');
  }
}
