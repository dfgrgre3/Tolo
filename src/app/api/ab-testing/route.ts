import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, withAuth, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const experiments = await prisma.experiment.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      const transformed = experiments.map((exp: any) => ({
        id: exp.id,
        title: exp.title,
        description: exp.description,
        status: exp.status,
        variantA: {
          name: exp.variantAName,
          views: exp.variantAViews,
          completionRate: exp.variantAViews > 0 ? (exp.variantACompletions / exp.variantAViews) * 100 : 0
        },
        variantB: {
          name: exp.variantBName,
          views: exp.variantBViews,
          completionRate: exp.variantBViews > 0 ? (exp.variantBCompletions / exp.variantBViews) * 100 : 0
        },
        startDate: exp.startDate.toISOString().split('T')[0],
        createdBy: exp.createdBy,
        sampleSize: exp.variantAViews + exp.variantBViews,
        createdAt: exp.createdAt.toISOString(),
        updatedAt: exp.updatedAt.toISOString()
      }));

      return successResponse(transformed);
    } catch (error: any) {
      return handleApiError(error);
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const data = await req.json();
        
        if (!data.title || !data.variantAName || !data.variantBName) {
          return badRequestResponse("Missing required fields");
        }
        
        const newExperiment = await prisma.experiment.create({
          data: {
            title: data.title,
            description: data.description || '',
            status: data.status || 'draft',
            variantAName: data.variantAName,
            variantBName: data.variantBName,
            createdBy: userId,
          }
        });
        
        return successResponse(newExperiment);
      } catch (error: any) {
        return handleApiError(error);
      }
    });
  });
}