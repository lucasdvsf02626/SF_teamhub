// UK Bank Holidays calculation
// Based on standard UK bank holidays

export interface BankHoliday {
  date: Date;
  name: string;
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

// Get next Monday if date falls on weekend
function getNextMonday(date: Date): Date {
  const day = date.getDay();
  if (day === 0) { // Sunday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  if (day === 6) { // Saturday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  }
  return date;
}

// Get bank holiday substitute if it falls on weekend
function getBankHolidayDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month, day);
  return getNextMonday(date);
}

// Get the last Monday of a month
function getLastMondayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : (dayOfWeek === 1 ? 0 : dayOfWeek - 1);
  return new Date(year, month, lastDay.getDate() - daysToSubtract);
}

// Get first Monday of a month
function getFirstMondayOfMonth(year: number, month: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToAdd = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  return new Date(year, month, 1 + daysToAdd);
}

export function getUKBankHolidays(year: number): BankHoliday[] {
  const holidays: BankHoliday[] = [];
  
  // New Year's Day (1 Jan, or substitute)
  holidays.push({
    date: getBankHolidayDate(year, 0, 1),
    name: "New Year's Day",
  });
  
  // Good Friday (2 days before Easter)
  const easter = getEasterSunday(year);
  holidays.push({
    date: new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2),
    name: "Good Friday",
  });
  
  // Easter Monday (1 day after Easter)
  holidays.push({
    date: new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1),
    name: "Easter Monday",
  });
  
  // Early May Bank Holiday (first Monday of May)
  holidays.push({
    date: getFirstMondayOfMonth(year, 4),
    name: "Early May Bank Holiday",
  });
  
  // Spring Bank Holiday (last Monday of May)
  holidays.push({
    date: getLastMondayOfMonth(year, 4),
    name: "Spring Bank Holiday",
  });
  
  // Summer Bank Holiday (last Monday of August)
  holidays.push({
    date: getLastMondayOfMonth(year, 7),
    name: "Summer Bank Holiday",
  });
  
  // Christmas Day (25 Dec, or substitute)
  const christmas = new Date(year, 11, 25);
  const christmasDay = christmas.getDay();
  if (christmasDay === 0) {
    // Sunday -> Monday
    holidays.push({
      date: new Date(year, 11, 26),
      name: "Christmas Day (substitute)",
    });
  } else if (christmasDay === 6) {
    // Saturday -> Monday
    holidays.push({
      date: new Date(year, 11, 27),
      name: "Christmas Day (substitute)",
    });
  } else {
    holidays.push({
      date: christmas,
      name: "Christmas Day",
    });
  }
  
  // Boxing Day (26 Dec, or substitute)
  const boxingDay = new Date(year, 11, 26);
  const boxingDayOfWeek = boxingDay.getDay();
  if (boxingDayOfWeek === 0) {
    // Sunday -> Tuesday (Monday is Christmas substitute)
    holidays.push({
      date: new Date(year, 11, 28),
      name: "Boxing Day (substitute)",
    });
  } else if (boxingDayOfWeek === 6) {
    // Saturday -> Monday
    holidays.push({
      date: new Date(year, 11, 28),
      name: "Boxing Day (substitute)",
    });
  } else if (christmasDay === 0) {
    // If Christmas was Sunday and moved to Monday, Boxing Day moves to Tuesday
    holidays.push({
      date: new Date(year, 11, 27),
      name: "Boxing Day (substitute)",
    });
  } else {
    holidays.push({
      date: boxingDay,
      name: "Boxing Day",
    });
  }
  
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Check if a date is a bank holiday
export function isBankHoliday(date: Date, bankHolidays: BankHoliday[]): BankHoliday | null {
  const dateStr = date.toDateString();
  return bankHolidays.find(h => h.date.toDateString() === dateStr) || null;
}

// Get bank holidays for a range of years
export function getBankHolidaysForYears(startYear: number, endYear: number): BankHoliday[] {
  const holidays: BankHoliday[] = [];
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getUKBankHolidays(year));
  }
  return holidays;
}
