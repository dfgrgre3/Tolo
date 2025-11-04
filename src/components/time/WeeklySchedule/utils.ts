import { startOfWeek, addDays, parseISO } from 'date-fns';
import type { TimeBlock, WeekStats } from './types';
import { DAYS_OF_WEEK } from './constants';

export const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

export const getBlockDuration = (startTime: string, endTime: string): number => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

export const getWeekDays = (currentWeek: Date) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

export const calculateWeekStats = (timeBlocks: TimeBlock[], currentWeek: Date): WeekStats => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  
  const weekBlocks = timeBlocks.filter(block => {
    const blockDate = addDays(weekStart, block.day);
    return blockDate >= weekStart && blockDate <= weekEnd;
  });
  
  const totalBlocks = weekBlocks.length;
  const studyBlocks = weekBlocks.filter(b => b.type === 'STUDY');
  const breakBlocks = weekBlocks.filter(b => b.type === 'BREAK');
  const completedBlocks = weekBlocks.filter(b => b.isCompleted).length;
  const upcomingBlocks = weekBlocks.filter(b => !b.isCompleted).length;
  
  const studyHours = studyBlocks.reduce((acc, block) => {
    const start = parseTime(block.startTime);
    const end = parseTime(block.endTime);
    return acc + (end - start) / (1000 * 60 * 60);
  }, 0);
  
  const breakHours = breakBlocks.reduce((acc, block) => {
    const start = parseTime(block.startTime);
    const end = parseTime(block.endTime);
    return acc + (end - start) / (1000 * 60 * 60);
  }, 0);
  
  // Find most busy day
  const dayBlockCounts = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    count: weekBlocks.filter(b => b.day === i).length
  }));
  const mostBusyDay = dayBlockCounts.reduce((max, current) => 
    current.count > max.count ? current : max
  );
  
  // Calculate average block duration
  const totalDuration = weekBlocks.reduce((acc, block) => {
    const start = parseTime(block.startTime);
    const end = parseTime(block.endTime);
    return acc + (end - start) / (1000 * 60); // minutes
  }, 0);
  const averageBlockDuration = totalBlocks > 0 ? totalDuration / totalBlocks : 0;
  
  return {
    totalBlocks,
    studyHours: Math.round(studyHours * 10) / 10,
    breakHours: Math.round(breakHours * 10) / 10,
    completedBlocks,
    upcomingBlocks,
    mostBusyDay: DAYS_OF_WEEK[mostBusyDay.day],
    averageBlockDuration: Math.round(averageBlockDuration)
  };
};

