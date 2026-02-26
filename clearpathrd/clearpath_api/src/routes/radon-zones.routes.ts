import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { lookupRadonZoneQuerySchema } from '../schemas/radon-zones.schemas.js';
import { lookupRadonZone } from '../services/radon-zone.service.js';

const radonZonesRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /radon-zones?fsa=M5V
   * Look up radon zone data by FSA (public endpoint)
   */
  serverWithTypes.get(
    '/',
    {
      schema: {
        querystring: lookupRadonZoneQuerySchema,
        description: 'Look up radon zone data by Forward Sortation Area (FSA)',
        tags: ['radon-zones'],
      },
    },
    async (request, reply) => {
      const { fsa } = request.query;

      // Validate FSA exists and retrieve zone data
      await lookupRadonZone(fsa, server.prisma);

      const fullZoneData = await server.prisma.radonZoneMap.findUnique({
        where: { fsa: fsa.toUpperCase() },
      });

      return reply.success(fullZoneData);
    }
  );
};

export default radonZonesRoutes;
