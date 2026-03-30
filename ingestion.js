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

function readMultilineInput(endToken = 'END') {
  return new Promise((resolve) => {
    console.log('Paste the Zillow listing below.');
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

async function main() {
  console.log('House Hack Listing Wrapper\n');

  const listing = await readMultilineInput();

  if (!listing) {
    console.error('\nNo listing text was provided.');
    process.exit(1);
  }

  const prompt = `I'm evaluating a potential house-hack property. Here's the listing:

${listing}

My setup:
- I will live there with my girlfriend during the hack phase. She pays $510/month toward household costs.
- The basement will be rented to a separate tenant during the hack phase (in addition to GF's $510).
- Hack phase duration: 1 year, then we move out and rent the whole property.

Please:
1. Review the basement description and estimate what it could realistically rent for (conservative / base / optimistic), noting any red flags or required improvements and their estimated cost
2. Run the house-hack simulation using rA = $510 + base basement rent, repA = any required improvement cost, and fullRentA = the full-house rent figure above
3. Include timeline sensitivity (5 / 10 / 15 / 20 years) and a verdict: Pass or Buy`;

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