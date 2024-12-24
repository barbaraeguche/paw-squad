import { lora } from '@/ui/fonts';

export default function Headings({ title }: {
	title: string
}) {
	return (
		<h3 className={`${lora.className} text-2xl text-center`}>{title}</h3>
	);
}