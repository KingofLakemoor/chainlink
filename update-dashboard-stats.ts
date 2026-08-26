import fs from 'fs';
let content = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf-8');

const targetStats = '                          <span className={cn("text-2xl font-bold", (chain?.chain || 0) > 0 ? "text-green-500" : (chain?.chain || 0) < 0 ? "text-red-500" : "text-zinc-500")}>\n' +
'                             {(chain?.chain || 0) > 0 ? `W${chain?.chain || 0}` : (chain?.chain || 0) < 0 ? `L${Math.abs(chain?.chain || 0)}` : \'-\'}\n' +
'                          </span>\n' +
'                      </div>\n' +
'                  </div>\n' +
'              </div>';

const replaceStats = '                          <span className={cn("text-2xl font-bold", (chain?.chain || 0) > 0 ? "text-green-500" : (chain?.chain || 0) < 0 ? "text-red-500" : "text-zinc-500")}>\n' +
'                             {(chain?.chain || 0) > 0 ? `W${chain?.chain || 0}` : (chain?.chain || 0) < 0 ? `L${Math.abs(chain?.chain || 0)}` : \'-\'}\n' +
'                          </span>\n' +
'                      </div>\n' +
'                  </div>\n' +
'                  <Link to="/mypicks" className="mt-4 block w-full">\n' +
'                      <Button variant="secondary" className="w-full text-zinc-300 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">\n' +
'                         View Detailed Stats & History\n' +
'                      </Button>\n' +
'                  </Link>\n' +
'              </div>';

content = content.replace(targetStats, replaceStats);
fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', content);
