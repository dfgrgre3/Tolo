import { buildSchema, Resolver, Query } from 'type-graphql';

@Resolver()
class HealthResolver {
  @Query(() => String)
  health() {
    return "ok";
  }
}

export async function createSchema() {
  return await buildSchema({
    resolvers: [HealthResolver],
    emitSchemaFile: true,
    validate: false
  });
}


// Example Resolver:
// @Resolver()
// export class AuthResolver {
//   @Query(() => User)
//   async user(@Arg('id') id: string) {
//     return getUserById(id);
//   }
// }
