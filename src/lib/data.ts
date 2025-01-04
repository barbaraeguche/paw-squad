'use server';
import { auth } from '../../auth';
import { prisma } from '../../prisma/script';
import { Pet } from './definitions';

// auth get user
export const getUserCredentials = async () => {
	return await auth();
}

// prisma - find a user by their email
export const getUserByEmail = async (email: string) => {
	return await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
        mode: 'insensitive'
			}
		}
	});
};

// prisma - create a new user
export const prismaCreateUser = async (
	name: string,
  email: string,
  password: string
) => {
	await prisma.user.create({
		data: {
			name,
			email,
      password
		}
	});
};

// prisma - add a new pet to both databases using transaction for atomicity
export const prismaRehomePet = async (
	userId: string,
	name: string,
	type: Pet['type'],
	breed: string,
	gender: Pet['gender'],
	{ age, comments }: Partial<Pet>,
	compatibility: Pet['compatibility'],
	image: string
) => {
	try {
		// check if user has reached the maximum rehome value (6)
		const counter = await prisma.user.findUnique({
			where: { id: userId },
			select: { rehomeCount: true }
		});
		// ensure user/counter exists and check limit
		if (!counter || counter.rehomeCount >= 6) {
			return 'You can only rehome a maximum of 6 pets.'
		}
		
		await prisma.$transaction(async (tx) => {
			const pet = await tx.pet.create({
				data: {
					name,
					type,
					breed,
					gender,
					age: age!,
					compatibility,
					image,
					comments: comments!
				}
			});
			await tx.rehomed.create({
				data: {
					petId: pet.id,
					userId
				}
			});
			await tx.user.update({
				where: { id: userId },
				data: {
					rehomeCount: { increment: 1 }
				}
			});
		});
	} catch (err) {
		console.error(`Failed to rehome pet: ${err}`);
		throw err;
	}
};

// prisma - add a pet to the adopted table using transaction for atomicity
export const prismaAdoptPet = async (petId: string, userId: string) => {
	try {
		// check if user has reached the maximum adopt value (4)
		const counter = await prisma.user.findUnique({
			where: { id: userId },
			select: { adoptCount: true }
		});
		// ensure user/counter exists and check limit
		if (!counter || counter.adoptCount >= 4) {
			return;
		}
		
		await prisma.$transaction(async (tx) => {
			await tx.adopted.create({
				data: {
					petId,
					userId
				}
			});
			await tx.user.update({
				where: { id: userId },
				data: {
					adoptCount: { increment: 1 }
				}
			});
		});
	} catch (err) {
		console.error(`Failed to adopt pet: ${err}`);
		throw err;
	}
};

// prisma - retrieve all available pets
export const prismaGetAvailablePets = async (userId: string) => {
	return await prisma.pet.findMany({
		where: {
			AND: [
				{
					NOT: { rehomed: { userId } }
				},
				{ adopted: null }
			]
		}
	});
};

// prisma - get the pets rehomed by a given user
export const getRehomedPets = async (id: string) => {
	const findUser = await prisma.user.findUnique({
		where: { id },
		include: { rehomed: true }
	});
	
	if (findUser) {
		const petIds = findUser.rehomed.map((pet) => pet.petId);
		return await prisma.pet.findMany({
			where: {
				id: { in: petIds }
			}
		});
	}
	
	return 'User not found';
};

// prisma - get the pets adopted by a given user
export const getAdoptedPets = async (id: string) => {
	const findUser = await prisma.user.findUnique({
		where: { id },
		include: { adopted: true }
	});
	
	if (findUser) {
		const petIds = findUser.adopted.map((pet) => pet.petId);
		return await prisma.pet.findMany({
      where: {
        id: { in: petIds }
      }
    });
	}
	
	return 'User not found';
};