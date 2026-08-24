const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

// Fix duplicate div
code = code.replace(
`<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">`,
`<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">`);

// Fix ending
code = code.replace(`          )}
        </div>
      )}
    </>
    )}
    </div>
  );
}`,
`          )}
        </div>
      )}
    </div>
  );
}`);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
