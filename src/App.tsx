import React, { useState } from 'react';

function App() {
  const [grammarText, setGrammarText] = useState(
`E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`
  );
  const [inputString, setInputString] = useState('id + id');
  const [firstSets, setFirstSets] = useState({});
  const [followSets, setFollowSets] = useState({});
  const [parseTable, setParseTable] = useState({});
  const [terminalsList, setTerminalsList] = useState([]);
  const [steps, setSteps] = useState([]);
  const [parseEntries, setParseEntries] = useState([]);

  // Compute FIRST sets
  const computeFirst = (grammar, nonterminals, terminals) => {
    const FIRST = {};
    nonterminals.forEach(A => (FIRST[A] = new Set()));
    let changed = true;

    const firstOfSeq = seq => {
      const result = new Set();
      for (let sym of seq) {
        if (terminals.has(sym)) {
          result.add(sym);
          return result;
        }
        for (let f of FIRST[sym]) if (f !== 'ε') result.add(f);
        if (!FIRST[sym].has('ε')) {
          return result;
        }
      }
      result.add('ε');
      return result;
    };

    while (changed) {
      changed = false;
      for (let [A, prods] of Object.entries(grammar)) {
        prods.forEach(rhs => {
          const fs = firstOfSeq(rhs);
          fs.forEach(sym => {
            if (!FIRST[A].has(sym)) {
              FIRST[A].add(sym);
              changed = true;
            }
          });
        });
      }
    }
    return FIRST;
  };

  const computeFollow = (grammar, nonterminals, terminals, FIRST) => {
    const FOLLOW = {};
    nonterminals.forEach(A => (FOLLOW[A] = new Set()));
    FOLLOW[nonterminals[0]].add('$');
    let changed = true;

    while (changed) {
      changed = false;
      for (let [A, prods] of Object.entries(grammar)) {
        prods.forEach(rhs => {
          let trailer = new Set(FOLLOW[A]);
          for (let i = rhs.length - 1; i >= 0; i--) {
            const sym = rhs[i];
            if (nonterminals.includes(sym)) {
              trailer.forEach(t => {
                if (!FOLLOW[sym].has(t)) {
                  FOLLOW[sym].add(t);
                  changed = true;
                }
              });
              if (FIRST[sym].has('ε')) {
                FIRST[sym].forEach(f => {
                  if (f !== 'ε') trailer.add(f);
                });
              } else {
                trailer = new Set(FIRST[sym]);
              }
            } else {
              trailer = new Set([sym]);
            }
          }
        });
      }
    }
    return FOLLOW;
  };


  // Build LL(1) parse table
  const buildParseTable = (grammar, nonterminals, terminals, FIRST, FOLLOW) => {
    const M = {};
    nonterminals.forEach(A => (M[A] = {}));
  
    const firstOfSeq = seq => {
      const res = new Set();
      for (let sym of seq) {
        if (terminals.has(sym)) {
          res.add(sym);
          return res;
        }
        FIRST[sym].forEach(f => {
          if (f !== 'ε') res.add(f);
        });
        if (!FIRST[sym].has('ε')) {
          return res;
        }
      }
      res.add('ε');
      return res;
    };
  
    for (let [A, prods] of Object.entries(grammar)) {
      prods.forEach(rhs => {
        const first_rhs = firstOfSeq(rhs);
        first_rhs.forEach(a => {
          if (a !== 'ε') M[A][a] = rhs;
        });
        if (first_rhs.has('ε')) {
          FOLLOW[A].forEach(b => {
            M[A][b] = [];
          });
        }
      });
    }
  
    return M;
  };  

  const handleParse = () => {
    // Parse grammar input
    const grammar = {};
    const nonterminals = [];
    const terminals = new Set();

    grammarText.trim().split('\n').forEach(line => {
      const [lhs, rhsText] = line.split('->').map(s => s.trim());
      nonterminals.push(lhs);
      grammar[lhs] = rhsText.split('|').map(prod =>
        prod
          .trim()
          .split(/\s+/)
          .filter(sym => sym && sym !== 'ε')
      );
    });
    // Collect terminals
    Object.values(grammar).flat().flat().forEach(sym => {
      if (!nonterminals.includes(sym)) terminals.add(sym);
    });
    terminals.add('$');

    const FIRST = computeFirst(grammar, nonterminals, terminals);
    const FOLLOW = computeFollow(grammar, nonterminals, terminals, FIRST);
    const M = buildParseTable(grammar, nonterminals, terminals, FIRST, FOLLOW);

    // Sorted terminals list
    const termList = [...terminals].sort((a, b) => (a === '$' ? 1 : b === '$' ? -1 : a.localeCompare(b)));

    // Build parse table entries
    const entries = [];
    nonterminals.forEach(nt => {
      termList.forEach(t => {
        if (M[nt][t] !== undefined) {
          const prodStr = M[nt][t].length ? M[nt][t].join(' ') : 'ε';
          entries.push({ nt, t, prod: prodStr });
        }
      });
    });

    // Parsing steps
    const inputTokens = inputString.trim().split(/\s+/);
    const stepsArr = [];
    let stack = ['$', nonterminals[0]];
    let idx = 0;

    while (true) {
      const top = stack[stack.length - 1];
      const current = idx < inputTokens.length ? inputTokens[idx] : '$';
      const stackStr = stack.join(' ');
      const inputStr = [...inputTokens.slice(idx), '$'].join(' ');

      if (top === '$' && current === '$') {
        stepsArr.push([stackStr, inputStr, 'ACCEPT']);
        break;
      }
      if (top === current) {
        stepsArr.push([stackStr, inputStr, `Match '${top}'`]);
        stack.pop();
        idx++; continue;
      }
      if (nonterminals.includes(top)) {
        const prod = M[top][current];
        if (prod) {
          stack.pop();
          if (prod.length > 0) prod.slice().reverse().forEach(sym => stack.push(sym));
          const prodStr = prod.length ? prod.join(' ') : 'ε';
          stepsArr.push([stackStr, inputStr, `${top} → ${prodStr}`]); continue;
        }
        stepsArr.push([stackStr, inputStr, 'ERROR: no rule']); break;
      }
      stepsArr.push([stackStr, inputStr, 'ERROR: mismatch']); break;
    }

    setFirstSets(FIRST);
    setFollowSets(FOLLOW);
    setParseTable(M);
    setTerminalsList(termList);
    setParseEntries(entries);
    setSteps(stepsArr);
  };

  return (
    <div className="App p-4">
      <h1 className="text-xl font-bold mb-4">LL(1) Parser Visualizer</h1>

      <div className="mb-4 p-4 rounded-lg border border-gray-300 bg-gray-50">
        <h2 className="text-md font-semibold mb-2">Petunjuk Simbol CFG & Input</h2>
        <ul className="list-disc list-inside text-sm">
          <li><strong>Non-terminal:</strong> Huruf kapital seperti <code className="bg-white px-1 py-0.5 rounded border">E</code>, <code className="bg-white px-1 py-0.5 rounded border">T</code>, dll.</li>
          <li><strong>Terminal:</strong> Token input seperti <code className="bg-white px-1 py-0.5 rounded border">id</code>, <code className="bg-white px-1 py-0.5 rounded border">+</code>, <code className="bg-white px-1 py-0.5 rounded border">*</code>, <code className="bg-white px-1 py-0.5 rounded border">(</code>, <code className="bg-white px-1 py-0.5 rounded border">)</code></li>
          <li><strong>Simbol epsilon:</strong> Gunakan <code className="bg-white px-1 py-0.5 rounded border">ε</code> untuk merepresentasikan produksi kosong.</li>
          <li><strong>Simbol akhir input:</strong> Parser akan otomatis menambahkan <code className="bg-white px-1 py-0.5 rounded border">$</code> di akhir input.</li>
          <li>Simbol dipisahkan spasi, contoh input: <code className="bg-white px-1 py-0.5 rounded border">id + id</code></li>
        </ul>
      </div>

      {/* Grammar Input and Parse Button */}
      <div className="mb-4">
        <label className="block font-semibold">Grammar (CFG):</label>
        <textarea className="w-full p-2 border rounded" rows={6} value={grammarText} onChange={e => setGrammarText(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block font-semibold">Input String:</label>
        <input type="text" className="w-full p-2 border rounded" value={inputString} onChange={e => setInputString(e.target.value)} />
      </div>
      <button className="p-2 bg-blue-500 text-white rounded" onClick={handleParse}>Parse</button>

      {Object.keys(firstSets).length > 0 && (
        <div className="mt-6 space-y-6">
          {/* FIRST Sets */}
          <div>
            <h2 className="text-lg font-semibold">FIRST Sets</h2>
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr><th className="border p-2">Nonterminal</th><th className="border p-2">FIRST</th></tr>
              </thead>
              <tbody>
                {Object.entries(firstSets).map(([A, set]) => (
                  <tr key={A}><td className="border p-2">{A}</td><td className="border p-2">{[...set].join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOLLOW Sets */}
          <div>
            <h2 className="text-lg font-semibold">FOLLOW Sets</h2>
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr><th className="border p-2">Nonterminal</th><th className="border p-2">FOLLOW</th></tr>
              </thead>
              <tbody>
                {Object.entries(followSets).map(([A, set]) => (
                  <tr key={A}><td className="border p-2">{A}</td><td className="border p-2">{[...set].join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parse Table Matrix */}
          <div>
            <h2 className="text-lg font-semibold">Parse Table (M)</h2>
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr><th className="border p-2">NT / T</th>{terminalsList.map(t => <th key={t} className="border p-2">{t}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(parseTable).map(([A, row]) => (
                  <tr key={A}>
                    <td className="border p-2 font-semibold">{A}</td>
                    {terminalsList.map(t => (
                      <td key={`${A}-${t}`} className="border p-2">
                        {row[t] !== undefined
                          ? `${A}→${row[t].length ? row[t].join(' ') : 'ε'}`
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parse Table Entries */}
          <div>
            <h2 className="text-lg font-semibold">Parse Table Entries ( LL(1) )</h2>
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr><th className="border p-2">Nonterminal</th><th className="border p-2">Terminal</th><th className="border p-2">Production</th></tr>
              </thead>
              <tbody>
                {parseEntries.map(({ nt, t, prod }, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{nt}</td><td className="border p-2">{t}</td><td className="border p-2">{`${nt}→${prod}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parsing Steps */}
          <div>
            <h2 className="text-lg font-semibold">Parsing Steps</h2>
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr><th className="border p-2">Stack</th><th className="border p-2">Input</th><th className="border p-2">Action</th></tr>
              </thead>
              <tbody>
                {steps.map(([stack, inp, act], idx) => (
                  <tr key={idx}>
                    <td className="border p-2 font-mono">{stack}</td>
                    <td className="border p-2 font-mono">{inp}</td>
                    <td className="border p-2">{act}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;