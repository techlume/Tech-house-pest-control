export function pick(source, allowed) {
  return Object.fromEntries(
    allowed
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => [key, source[key]]),
  );
}
