
export const subtractDates = async (dateToSubtract: Date) => {
  const currentDate = new Date(new Date().toISOString());
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const utcCurrentDate = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  const utcDateToSubtract = Date.UTC(
    dateToSubtract.getFullYear(),
    dateToSubtract.getMonth(),
    dateToSubtract.getDate(),
  );
  return Math.floor((utcCurrentDate - utcDateToSubtract) / millisecondsPerDay);
};
