import React, { useState } from 'react';

// Langkah parser
interface Step {
  stack: string[];
  input: string[];
  action: string;
}

// Fungsi untuk parsing grammar dan mengekstrak terminal
const parseGrammar = (grammar: string): string[] => {
  const terminals = new Set<string>();
  const productions = grammar.split("|");
  productions.forEach(prod => {
    prod.split(/\s+/).forEach(symbol => {
      if (!symbol.match(/^[A-Z]$/) && symbol !== '->' && symbol !== '') {
        terminals.add(symbol);
      }
    });
  });
  return Array.from(terminals);
};

// Tokenizer dinamis
const tokenize = (input: string, terminals: string[]): string[] => {
  const pattern = new RegExp(
    terminals.map(t => (t === 'id' ? 'id' : `\\${t}`)).join('|'),
    'g'
  );
  const tokens: string[] = [];
  let match;
  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
};

// Parse input berdasarkan precedence
const parseInput = (
  inputStr: string,
  precedenceTable: Record<string, Record<string, string>>,
  terminals: string[]
): Step[] => {
  const inputTokens = tokenize(inputStr, terminals).concat('$');
  const stack: string[] = ['$'];
  const steps: Step[] = [];

  while (true) {
    // Cari simbol tertinggi pada stack yang ada di table
    const topSymbol = [...stack]
      .reverse()
      .find(sym => precedenceTable[sym]) || '$';
    const currentSymbol = inputTokens[0];
    const relation = precedenceTable[topSymbol]?.[currentSymbol];

    if (topSymbol === '$' && currentSymbol === '$') {
      steps.push({ stack: [...stack], input: [...inputTokens], action: 'Accept' });
      break;
    }

    if (relation === '<' || relation === '=') {
      steps.push({ stack: [...stack], input: [...inputTokens], action: 'Shift' });
      stack.push(inputTokens.shift()!);
    } else if (relation === '>') {
      steps.push({ stack: [...stack], input: [...inputTokens], action: 'Reduce' });
      // Pop sampai menemukan boundary
      while (true) {
        const popped = stack.pop();
        const prevTop = [...stack]
          .reverse()
          .find(sym => precedenceTable[sym]) || '$';
        const rel = precedenceTable[prevTop]?.[popped!];
        if (rel === '<' || rel === '=') break;
      }
    } else {
      steps.push({ stack: [...stack], input: [...inputTokens], action: 'Error' });
      break;
    }
  }

  return steps;
};

const BottomUpParser: React.FC = () => {
  const [grammar, setGrammar] = useState("E -> E + E | E * E | ( E ) | id");
  const [inputString, setInputString] = useState("id + id * id");
  const [precedenceInput, setPrecedenceInput] = useState(
    `id > id
id > +
id > *
id > )
+ < id
+ < (
+ > +
+ > *
+ > )
* < id
* < (
* > +
* > *
* > )
( < id
( < +
( < *
( < (
( = )
$ < id
$ < (
$ < +
$ < *
$ = $
` // tidak perlu mencantumkan relations untuk '$'
  );
  const [steps, setSteps] = useState<Step[]>([]);

  const handleParse = () => {
    // 1. Ekstrak terminal dari grammar
    const terminals = parseGrammar(grammar);
    // tambahkan end-marker
    const allSymbols = [...terminals, '$'];

    // 2. Bangun tabel precedence default (' ' artinya undefined)
    const table: Record<string, Record<string, string>> = {};
    allSymbols.forEach(row => {
      table[row] = {};
      allSymbols.forEach(col => {
        table[row][col] = ' ';
      });
    });

    // 3. Isi tabel dari input user
    precedenceInput.trim().split('\n').forEach(line => {
      const [left, rel, right] = line.trim().split(/\s+/);
      if (left && right && rel) {
        table[left][right] = rel;
      }
    });

    // 4. Isi otomatis relations untuk end-marker '$'
    terminals.forEach(term => {
      table['$'][term] = '<';   // '$' memiliki relasi kurang dengan semua terminal
      table[term]['$'] = '>';   // semua terminal more precedence terhadap '$'
    });
    table['$']['$'] = '=';      // akhir input

    // 5. Parse dan simpan langkahnya
    const result = parseInput(inputString, table, terminals);
    setSteps(result);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Operator Precedence Parser</h1>

      {/* Grammar */}
      <div className="mb-4">
        <label className="block font-medium">Grammar</label>
        <textarea
          className="input-modern"
          value={grammar}
          onChange={e => setGrammar(e.target.value)}
        />
      </div>

      {/* Input String */}
      <div className="mb-4">
        <label className="block font-medium">Input String</label>
        <input
          className="input-modern"
          value={inputString}
          onChange={e => setInputString(e.target.value)}
        />
      </div>

      {/* Precedence Relations */}
      <div className="mb-4">
        <label className="block font-medium">Precedence Relations (format: a &lt; b)</label>
        <textarea
          className="input-modern"
          value={precedenceInput}
          onChange={e => setPrecedenceInput(e.target.value)}
        />
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleParse}
      >
        Parse
      </button>

      {/* Tabel langkah parsing */}
      {steps.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Langkah Parsing</h2>
          <table className="w-full border border-collapse">
            <thead>
              <tr>
                <th className="border p-2">Langkah</th>
                <th className="border p-2">Stack</th>
                <th className="border p-2">Input</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={i}>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{step.stack.join(' ')}</td>
                  <td className="border p-2">{step.input.join(' ')}</td>
                  <td className="border p-2">{step.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BottomUpParser;
