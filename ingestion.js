#!/usr/bin/env node

import readline from 'readline';
import { spawn } from 'child_process';

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    const platform = process.platform;

    let proc;
    if (platform === 'darwin') {
      proc = spawn('pbcopy');
    } else if (platform === 'win32') {
      proc = spawn('clip');
    } else {
      proc = spawn('xclip', ['-selection', 'clipboard']);
    }

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Clipboard command exited with code ${code}`));
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

function readMultilineInput(label, endToken = 'END') {
  return new Promise((resolve) => {
    console.log(`${label}`);
    console.log(`When finished, type ${endToken} on its own line and press Enter.\n`);

    const lines = [];
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl.on('line', (line) => {
      if (line.trim() === endToken) {
        rl.close();
        return;
      }
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines.join('\n').trim());
    });
  });
}

function buildPrompt({ listing, taxInfo }) {
  return `# House Hack Property Analysis Request

Use \`.claude/skills/house-hack-research/zips/20743.md\` as the reference methodology. Analyze the following property for a house-hack scenario.

**First, before any other analysis, determine whether the basement is likely legally rentable.** If it is not clearly legally rentable, say so immediately, explain why, and treat that as the main gating issue.

Then provide:
- basement rentability assessment (legal + physical condition)
- basement rental estimate as-is
- basement rental estimate after improvements
- full house rental estimate as-is
- full house rental estimate after improvements if relevant
- upfront cost estimates to make the basement rentable
- annual depreciation tax benefit using property value / 27.5, including annual % of property value
- key risks and red flags

Distinguish clearly between:
- legally rentable
- physically rentable
- tenant-ready / marketable

End with a clear recommendation: pursue, pursue with caution, or do not pursue.

## Listing Information

${listing}

## Tax / Property Value Information

${taxInfo}

## Notes

- Base all estimates on the listing details and tax/property information above.
- If property value, assessed value, tax record details, or land/building split are incomplete, state your assumptions clearly.
- For depreciation, call out that land is not depreciable where relevant, and explain whether your estimate uses total property value as a rough proxy or an adjusted building-only assumption.
- If the basement is not legally rentable as-is, still provide a brief view of what would likely be required to make it rentable and the rough before/after rent difference if feasible.
`;
}

async function main() {
  console.log('House Hack Listing + Tax Wrapper\n');

  const listing = await readMultilineInput('Paste the property listing below.');
  if (!listing) {
    console.error('\nNo listing text was provided.');
    process.exit(1);
  }

  console.log('');
  const taxInfo = await readMultilineInput(
    'Paste the tax, assessment, and any property value information below.'
  );

  if (!taxInfo) {
    console.error('\nNo tax/property value information was provided.');
    process.exit(1);
  }

  const prompt = buildPrompt({ listing, taxInfo });

  try {
    await copyToClipboard(prompt);
    console.log('\nCopied to clipboard.\n');
  } catch (err) {
    console.warn('\nCould not copy to clipboard automatically.');
    console.warn(String(err));
    console.warn('');
  }

  console.log('----- COPY BELOW -----\n');
  console.log(prompt);
  console.log('\n----- END -----\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});