'use client';

import { useState, useEffect } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import { Course } from '@/gen/thanawy/v1/course_pb';

export default function GrpcDemoPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await rpcClient.getCourses({});
        setCourses(response.courses);
      } catch (err) {
        console.error('Failed to fetch courses via gRPC/Connect:', err);
        setError('Failed to fetch courses. Check console for details.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        gRPC/Connect Demo
      </h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300">
        This page fetches data using the new gRPC/Connect integration. 
        It bypasses the traditional REST API and uses type-safe Protobuf communication.
      </p>

      {loading && (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {courses.length === 0 ? (
            <p className="text-center text-gray-500 py-12 border-2 border-dashed rounded-xl">
              No courses found. Add some to the database to see them here.
            </p>
          ) : (
            courses.map((course) => (
              <div 
                key={course.id} 
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {course.title}
                    </h2>
                    <p className="text-sm text-indigo-500 font-medium mb-2">
                      Instructor: {course.teacherName || 'Unknown'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {course.description || 'No description provided.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full uppercase tracking-wider">
                    gRPC
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
