function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function formatDate(dateLike = new Date(), pattern = 'YYYY-MM-DD') {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';

  const YYYY = String(date.getFullYear());
  const MM = pad2(date.getMonth() + 1);
  const DD = pad2(date.getDate());
  const HH = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  return pattern
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss);
}

module.exports = {
  formatDate
};

