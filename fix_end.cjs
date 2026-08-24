const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

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
