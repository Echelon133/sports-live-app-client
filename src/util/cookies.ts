export function getCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .filter(row => row.startsWith(`${name}=`))
    .map(c => c.split('=')[1])[0];
}

export function setCookie(name: string, value: string, lifetimeMinutes: number) {
  const minutesInMilis = lifetimeMinutes * 60 * 1000;
  const d = new Date();
  d.setTime(d.getTime() + minutesInMilis);
  const cookieValue = `${name}=${value}; expires=${d.toUTCString()}`;
  document.cookie = cookieValue;
}
