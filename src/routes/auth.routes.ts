import { FastifyInstance } from "fastify";
import { HttpError } from "../errors/HttpError";
import { formatZodError } from "../errors/ZoodError";
import { UserSchema } from "../schemas/user.schema";
import { UserCreate, UserLogin } from "../interface/user.interface";
import { AuthUseCase } from "../usercases/auth.usecase";
import { LoginSchema } from "../schemas/login.schema";
import { ValidateTokenRequest } from "../interface/token.interface";
import jwt from 'jsonwebtoken';

export async function authRoutes(fastify: FastifyInstance) {
    const authUserCase = new AuthUseCase();

    fastify.post<{ Body: UserCreate }>('/signup', {
        preHandler: async (req, reply) => {
            const result = UserSchema.safeParse(req.body);

            if (!result.success) {
                throw new HttpError({ code: 422, message: formatZodError(result.error) });
            }

            req.body = result.data;
        },
        handler: async (req, reply) => {
            const dataBody = req.body;

            try {
                const user = await authUserCase.create(dataBody);

                const token = fastify.jwt.sign({ id: user.id, email: user.email });

                return reply.status(201).send({ token });
            } catch (error) {
                if (error instanceof HttpError) {
                    return reply.status(error.code).send({ message: error.message });
                } else if (error instanceof Error) {
                    return reply.status(500).send({ message: error.message });
                } else {
                    return reply.status(500).send({ message: 'Unknown error occurred' });
                }
            }
        }
    });

    fastify.post<{ Body: UserLogin }>('/login', {
        preHandler: async (req, reply) => {
            const result = LoginSchema.safeParse(req.body);

            if (!result.success) {
                throw new HttpError({ code: 422, message: formatZodError(result.error) });
            }

            req.body = result.data;
        },
        handler: async (req, reply) => {
            const dataBody = req.body;

            try {
                const user = await authUserCase.verifyCredentials(dataBody);

                if (user) {
                    const token = fastify.jwt.sign({ id: user.id, email: user.email });
                    return reply.send({ token });
                }

            } catch (error) {
                if (error instanceof HttpError) {
                    return reply.status(error.code).send({ message: error.message });
                } else if (error instanceof Error) {
                    return reply.status(500).send({ message: error.message });
                } else {
                    return reply.status(500).send({ message: 'Unknown error occurred' });
                }
            }
        }
    });

    fastify.post<{ Body: ValidateTokenRequest }>('/validate-token', {
        handler: async (req, reply) => {
            const { token } = req.body;

            if (!token) {
                return reply.status(400).send({ valid: false, message: 'Token não fornecido' });
            }

            try {
                const tokenValidate = await fastify.jwt.verify(token);

                if (!tokenValidate) {
                    throw new HttpError({ code: 401, message: 'Token inválido' });
                }

                return reply.status(200).send({ valid: true });
            } catch (error) {
                if (error instanceof HttpError) {
                    return reply.status(error.code).send({ message: error.message });
                } else if (error instanceof Error) {
                    return reply.status(500).send({ message: error.message });
                } else {
                    return reply.status(500).send({ message: 'Unknown error occurred' });
                }
            }
        }
    });

}
