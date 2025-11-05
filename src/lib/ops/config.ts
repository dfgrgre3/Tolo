/**
 * Ops Configuration
 * 
 * ملف التكوين المركزي لجميع خدمات Ops (Monitoring, Logging, Tracing)
 */

export const opsConfig = {
  // Prometheus Configuration
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED !== 'false',
    endpoint: process.env.METRICS_ENDPOINT || '/api/metrics',
  },

  // ELK Stack Configuration
  elk: {
    enabled: process.env.ELASTICSEARCH_ENABLED !== 'false',
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || '',
      ssl: process.env.ELASTICSEARCH_SSL === 'true',
    },
    index: `thanawy-logs-${process.env.NODE_ENV || 'development'}`,
  },

  // Jaeger Configuration
  jaeger: {
    enabled: process.env.JAEGER_ENABLED !== 'false',
    agentHost: process.env.JAEGER_AGENT_HOST || 'jaeger',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831', 10),
    endpoint: process.env.JAEGER_ENDPOINT || `http://jaeger:14268/api/traces`,
    serviceName: process.env.SERVICE_NAME || 'thanawy',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Application Configuration
  app: {
    name: process.env.SERVICE_NAME || 'thanawy',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
};

// التحقق من التكوين
export function validateOpsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (opsConfig.elk.enabled && !opsConfig.elk.elasticsearch.url) {
    errors.push('ELASTICSEARCH_URL is required when ELK is enabled');
  }

  if (opsConfig.jaeger.enabled && !opsConfig.jaeger.agentHost) {
    errors.push('JAEGER_AGENT_HOST is required when Jaeger is enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

