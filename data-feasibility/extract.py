import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / 'vendor'))
from pypdf import PdfReader

results = []
for file in sorted((ROOT / 'evidence').glob('*.pdf')):
    reader = PdfReader(file)
    pages = [page.extract_text() or '' for page in reader.pages]
    (ROOT / 'evidence' / (file.stem + '.txt')).write_text('\n\n'.join(f'--- PAGE {i+1} ---\n{text}' for i, text in enumerate(pages)), encoding='utf8')
    matches = []
    for i, text in enumerate(pages):
        for match in list(re.finditer(r'Certification Basis|Type Certification Basis|CAR 3|23\.\d+|FAR 33|Part 35|api-key|API Key|rate limit|https://', text, re.I))[:6]:
            matches.append({'page': i+1, 'excerpt': re.sub(r'\s+', ' ', text[max(0, match.start()-70):match.end()+250])})
    result = {'file': file.name, 'pages': len(pages), 'textCharacters': sum(map(len, pages)), 'firstPage': pages[0][:700], 'evidence': matches[:15]}
    results.append(result)
    print(json.dumps(result))
(ROOT / 'evidence' / 'extraction-results.json').write_text(json.dumps(results, indent=2), encoding='utf8')
