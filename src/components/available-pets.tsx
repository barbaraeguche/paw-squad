'use client';
import { Fragment, useState, useEffect } from 'react';
import { useAdoptContext } from '@/hooks/adopt-context';
import { base64ToImage } from '@/lib/utils';
import { prismaGetAvailablePets } from '@/lib/data';
import { Pet } from '@/lib/definitions';
import PetCard from '@/ui/pet-card';
import PetCardsSkeleton from '@/ui/skeleton';
import Headings from '@/components/headings';

export default function AvailablePets({ type, breed, gender, age, compatibility }: {
	type: string,
	breed: string,
	gender: string,
	age: string,
	compatibility: Pet['compatibility']
}) {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [allPets, setAllPets] = useState<Pet[]>([]);
	const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
	const { filterTrigger } = useAdoptContext();
	
	// rather than ping the db on every update, fetch once and filter
	useEffect(() => {
		const loadAvailablePets = async () => {
			setIsLoading(true); // start loading
			
			try {
				setAllPets(await prismaGetAvailablePets());
				allPets.map(async (pet) => {
					const imageUrl = await base64ToImage(pet.image);
					return { ...pet, imageUrl }
				});
			} catch (err) {
				console.error(`Failed to process image for pet`, err);
			} finally {
				setIsLoading(false); // stop loading once fetched
			}
		};
		
		loadAvailablePets();
	});
	useEffect(() => {
		if (allPets.length > 0) {
			setFilteredPets(allPets.filter((pet) => {
				return (
					(!type || pet.type === type) &&
					(!breed || pet.breed === breed) &&
					(!gender || pet.gender === gender) &&
					(!age || pet.age === age) &&
					(!compatibility || compatibility.every((comp) => pet.compatibility.includes(comp)))
				);
			}));
		}
	}, [allPets, type, breed, gender, age, compatibility]);
	
	return (
		<Fragment>
			<Headings title="Our Available Pets"/>
			{isLoading ? (
				<PetCardsSkeleton isAdopting={true}/>
			) : (
				filteredPets.length === 0 ? (
					<div className="flex justify-center">
						<span className="!mt-16 toGrid:!mt-36 text-base">No matching pets available</span>
					</div>
				) : (
					<PetCard pets={filteredPets} isAdopting={true}/>
				)
			)}
		</Fragment>
	);
}