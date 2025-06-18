export function multiply(a: number, b: number): number {
  return a * b;
}

export function identitiy<T>(arg: T): T {
  return arg;
}

function main() {
  console.log('multiply 1 2', multiply(1, 2));
  console.log('identitiy 1', identitiy('1'));
}

main();
