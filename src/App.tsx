import { Routes, Route } from "react-router-dom";
import MapPage from "./pages/MapPage";
import DeparturesPage from "./pages/DeparturesPage";
import AboutPage from "./pages/AboutPage";
import Nav from "./components/Nav";

function App() {
	return (
		<>
			<Nav />
			<Routes>
				<Route path="/" element={<MapPage />} />
				<Route path="/departures" element={<DeparturesPage />} />
				<Route path="/about" element={<AboutPage />} />
			</Routes>
		</>
	);
}

export default App;
