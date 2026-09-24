import type { Metadata } from "next";
import { Favorites } from "@/components/favorites/Favorites";
export const metadata: Metadata={title:"Favoritos"};
export default function FavoritesPage(){return <Favorites/>}
