import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

const targetContent = `              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Join Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Enter a secret code to join"
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              )}`;

const replacementContent = `              {isPrivate && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Join Code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      placeholder="Enter a secret code to join"
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  {joinCode && (
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Direct Share Link</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={\`\${window.location.origin}/pickem?joinCode=\${joinCode}\`}
                          className="flex-1 bg-black/50 border border-zinc-800/50 rounded px-3 py-1.5 text-zinc-300 text-sm"
                        />
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(\`\${window.location.origin}/pickem?joinCode=\${joinCode}\`);
                            alert('Link copied to clipboard!');
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
