import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { code, protocolName } = await request.json();

        if (!code) {
            return json({ error: 'No code provided' }, { status: 400 });
        }

        // Create a temporary directory
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdk-'));
        const sdkDir = path.join(tmpDir, `${protocolName}-sdk`);
        await fs.mkdir(sdkDir);

        // Create directories for each language
        const languages = ['typescript', 'python', 'go', 'rust'];
        for (const lang of languages) {
            if (code[lang]) {
                const langDir = path.join(sdkDir, lang);
                await fs.mkdir(langDir);

                let filename = 'main';
                let ext = '';
                switch (lang) {
                    case 'typescript': ext = 'ts'; filename = 'index'; break;
                    case 'python': ext = 'py'; filename = 'main'; break;
                    case 'go': ext = 'go'; filename = 'main'; break;
                    case 'rust': ext = 'rs'; filename = 'main'; break;
                }

                await fs.writeFile(path.join(langDir, `${filename}.${ext}`), code[lang]);
            }
        }

        // Create README
        const readmeContent = `# ${protocolName} SDK

This SDK contains auto-generated code for the ${protocolName} protocol.

## Structure

- \`typescript/\`: TypeScript implementation
- \`python/\`: Python implementation
- \`go/\`: Go implementation
- \`rust/\`: Rust implementation

## Usage

Check the specific language directories for usage instructions.
`;
        await fs.writeFile(path.join(sdkDir, 'README.md'), readmeContent);

        // Zip the directory
        const zipFilePath = path.join(tmpDir, 'sdk.zip');
        // Use 'zip' command (assumed to be available as per user instruction)
        // -r: recursive
        // -j: junk paths (do not store full path) - actually we want to keep structure relative to sdkDir
        // cd to tmpDir so the zip contains the sdk folder at root
        await execAsync(`cd "${tmpDir}" && zip -r sdk.zip "${protocolName}-sdk"`);

        // Read the zip file
        const zipBuffer = await fs.readFile(zipFilePath);

        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true });

        return new Response(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${protocolName}-sdk.zip"`
            }
        });

    } catch (error) {
        console.error('SDK Download Error:', error);
        return json({ error: 'Failed to generate SDK zip' }, { status: 500 });
    }
};
