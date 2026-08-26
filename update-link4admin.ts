import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/link4/Link4AdminPage.tsx', 'utf-8');

if (!content.includes('import Link4SegmentDetail')) {
  content = content.replace(
    "import { SUPPORTED_LEAGUES, scrapeLeagueSchedules } from '../../../services/espnScraper';",
    "import { SUPPORTED_LEAGUES, scrapeLeagueSchedules } from '../../../services/espnScraper';\nimport Link4SegmentDetail from './Link4SegmentDetail';"
  );
}

if (!content.includes('selectedSegmentId')) {
  content = content.replace(
    "const [segments, setSegments] = useState<Link4Segment[]>([]);",
    "const [segments, setSegments] = useState<Link4Segment[]>([]);\n  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);"
  );
}

if (!content.includes('if (selectedSegmentId)')) {
  content = content.replace(
    "return (\n    <div className=\"flex flex-col h-full overflow-y-auto p-4 md:p-8\">",
    "if (selectedSegmentId) {\n    return <Link4SegmentDetail segmentId={selectedSegmentId} onBack={() => setSelectedSegmentId(null)} />;\n  }\n\n  return (\n    <div className=\"flex flex-col h-full overflow-y-auto p-4 md:p-8\">"
  );
}

content = content.replace(
  "</div>\n                    </div>\n\n                    <div className=\"space-y-2 text-sm mb-4\">",
  "  <button\n                          onClick={() => setSelectedSegmentId(segment.id)}\n                          className=\"p-1.5 text-zinc-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors\"\n                          title=\"Manage Matchups\"\n                        >\n                          <Calendar className=\"w-4 h-4\" />\n                        </button>\n                      </div>\n                    </div>\n\n                    <div className=\"space-y-2 text-sm mb-4\">"
);


fs.writeFileSync('src/pages/admin/link4/Link4AdminPage.tsx', content);
