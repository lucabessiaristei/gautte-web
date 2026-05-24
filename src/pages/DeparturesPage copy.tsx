import { useState, useEffect } from "react";
import type { DepartingLine, StopSearchResult } from "../types/index";
import fetchDepartures from "../services/departuresService";
import { searchStops } from "../services/searchStops";
import { getCurrentDate, getCurrentTime } from "../utils/timeHelpers"

function DeparturesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<StopSearchResult[]>([]);
	const [showResults, setShowResults] = useState(false);
	const [selectedStop, setSelectedStop] = useState<StopSearchResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [departingLines, setDepartingLines] = useState<DepartingLine[]>([]);
    const [date, setDate] = useState(getCurrentDate())
    const [time, setTime] = useState(getCurrentTime())

	// handleSearchQuery — runs when the user types, calls searchStops and updates searchResults

	const handleSearchQuery = async () => {
		if (searchQuery.length < 1) {
			setShowResults(false);
			return;
		}
		const queryResult = await searchStops(searchQuery);
		if (queryResult.length > 0) {
			setSearchResults(queryResult);
			setShowResults(true);
		} else {
			setShowResults(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			handleSearchQuery();
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleStopSelect = (stop: StopSearchResult) => {
		setSelectedStop(stop);
		handleSearch(stop.stopCode);
        console.log(stop);
        console.log(stop.stopCode);
		setShowResults(false);
	};

	const handleSearch = async (stopCode: string) => {
		setLoading(true)
    const result = await fetchDepartures(stopCode)
    console.log('fetchDepartures result:', result)
    setDepartingLines(result)
    setLoading(false)
	};

	return (
		<>
			<div className="container">
			    <h1 className="text-red-500">Departures</h1>
    			<input className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                name="searchQuery" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
    			<ul className={showResults ? "block" : "hidden"}>
    				{searchResults.map((stop) => (
    					<li key={stop.stopCode} onClick={() => handleStopSelect(stop)}>
    						{stop.stopCode} — {stop.readableName}
    					</li>
    				))}
    			</ul>
    
    			<div className="results">
    				<h2>{selectedStop ? `${selectedStop.stopCode} — ${selectedStop.readableName}` : ''}</h2>
    				{departingLines.map((line) => (
    					<div key={`${line.name}-${line.headsign}`}>
    						<span>{line.name}</span> — <span>{line.headsign}</span>:
    						<ul>
    							{line.departures.map((departure) => (
    								<li key={departure.scheduledTime}>
    									{departure.realtimeTime
    										? `${departure.realtimeTime}${departure.delayMin !== null ? ` (${departure.delayMin! > 0 ? "+" : ""}${departure.delayMin}min)` : ""}`
    										: departure.scheduledTime}
    								</li>
    							))}
    						</ul>
    					</div>
    				))}
    			</div>
			</div>
		</>
	);
}

export default DeparturesPage;
