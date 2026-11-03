/**
 * Works out a sum typed in the notes ball's calculator, like "200*360 + 3000" or "18% of 5000" written as
 * "5000*18%": numbers, + − × ÷, brackets and %. Returns null while it isn't a complete sum. No eval.
 */
export function calculate(input: string): number | null {
  const s = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  if (!s || /[^0-9.+\-*/()%]/.test(s)) return null;
  let i = 0;
  const peek = () => s[i];

  const percent = (value: number) => {
    if (peek() !== "%") return value;
    i++;
    return value / 100;
  };
  const factor = (): number => {
    if (peek() === "-") {
      i++;
      return -factor();
    }
    if (peek() === "(") {
      i++;
      const value = sum();
      if (s[i++] !== ")") throw new Error("bracket");
      return percent(value);
    }
    const number = /^\d*\.?\d+/.exec(s.slice(i));
    if (!number) throw new Error("number");
    i += number[0].length;
    return percent(parseFloat(number[0]));
  };
  const product = (): number => {
    let value = factor();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const next = factor();
      value = op === "*" ? value * next : value / next;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const next = product();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  };

  try {
    const value = sum();
    return i === s.length && Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : null;
  } catch {
    return null;
  }
}
