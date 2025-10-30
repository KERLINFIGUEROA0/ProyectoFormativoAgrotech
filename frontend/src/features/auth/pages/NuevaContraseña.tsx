
import { type ReactElement } from "react";
import NuevaContraseña from "../components/NuevaContraseña";
import bg from "../../../assets/bg-login.jpg";

export default function NuevaContraseñaPage(): ReactElement {
	return (
		<div
			className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
			style={{ backgroundImage: `url(${bg})` }}
		>
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
			<div className="relative z-20 w-full max-w-4xl px-6 py-20 flex items-center justify-center">
				<NuevaContraseña />
			</div>
		</div>
	);
}

