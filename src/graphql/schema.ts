import { buildSchema } from 'type-graphql';
import { AuthResolver } from './resolvers/auth-resolver';

export async function createSchema() {
  return await buildSchema({
    resolvers: [AuthResolver],
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
