import { useState, useEffect } from "react";
import type { DepartingLine } from "../types/index";
import fetchDepartures from "../services/departuresService";
import { searchStops } from "../services/searchStops";
import { getCurrentDate, getCurrentTime } from "../utils/timeHelpers";
import { getTransportIcon } from "../utils/transportIcon";

import AsyncSelect from "react-select/async";
type StopOption = {
	value: string;
	label: string;
};

function DeparturesPage() {
	const [loading, setLoading] = useState(false);
	const [selectedStop, setSelectedStop] = useState<StopOption | null>(null);
	const [departingLines, setDepartingLines] = useState<DepartingLine[]>([]);
	const [displayLabel, setDisplayLabel] = useState<string>("");
	const [date, setDate] = useState(getCurrentDate());
	const [time, setTime] = useState(getCurrentTime());

	const loadOptions = async (query: string): Promise<StopOption[]> => {
		const results = await searchStops(query);
		return results.map((stop) => ({
			value: stop.stopCode,
			label: stop.stopCode + " – " + stop.readableName,
		}));
	};

	const handleStopSelect = (option: StopOption | null) => {
		if (!option) return;
		console.log("selected:", option);
		setSelectedStop(option);
		handleSearch(option.value);
		setDisplayLabel(option.label);
	};

	const handleSearch = async (stopCode: string) => {
		setLoading(true);
		const result = await fetchDepartures(stopCode);
		console.log("fetchDepartures result:", result);
		setDepartingLines(result);
		setLoading(false);
	};

	return (
		<div className="max-w-2xl mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold text-gray-900 mb-6">Prossime partenze</h1>

			<AsyncSelect
				value={selectedStop}
				onMenuOpen={() => setSelectedStop(null)}
				loadOptions={loadOptions}
				onChange={handleStopSelect}
				placeholder="Cerca fermata per nome o numero..."
				menuPortalTarget={document.body}
				noOptionsMessage={() => "Nessuna fermata trovata"}
				loadingMessage={() => "Ricerca..."}
				unstyled
				classNames={{
					// Search bar container
					control: ({ isFocused, isDisabled }) =>
						[
							"flex items-center px-3 py-2 rounded-xl border text-sm transition-all duration-200 hover:shadow-md",
							isFocused ? "border-blue-500 shadow-md" : "border-gray-300",
							isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-text hover:border-gray-400",
						].join(" "),

					// Dropdown container
					menu: () => "mt-1 rounded-xl border border-gray-200 shadow-lg bg-white overflow-hidden",

					// Each option in dropdown
					option: ({ isFocused, isSelected }) =>
						[
							"px-4 py-2 text-sm cursor-pointer transition-colors duration-100",
							isSelected ? "bg-blue-600 text-white" : "",
							isFocused && !isSelected ? "bg-blue-50 text-gray-900" : "",
							!isFocused && !isSelected ? "text-gray-700" : "",
						].join(" "),

					// Placeholder text
					placeholder: () => "text-gray-400 text-sm",

					// Selected value text
					singleValue: () => "text-gray-900 text-sm font-medium",

					// Text input inside the control
					input: () => "text-gray-900 text-sm",

					// Loading indicator container
					loadingIndicator: () => "text-gray-400",

					// "Loading..." message in dropdown
					loadingMessage: () => "text-gray-400 text-sm px-4 py-2",

					// "No options" message in dropdown
					noOptionsMessage: () => "text-gray-400 text-sm px-4 py-2",

					// Clear (X) button
					clearIndicator: () => "text-gray-400 hover:text-red-500 cursor-pointer px-1",

					// Dropdown arrow
					dropdownIndicator: () => "text-gray-400 hover:text-gray-600 cursor-pointer px-1",
				}}
			/>

			{departingLines.length > 0 ? (
				<div className="mt-6 space-y-4">
					{displayLabel && <h2 className="text-lg font-semibold text-gray-800">{displayLabel}</h2>}
					{departingLines.map((line) => (
						<div
							key={`${line.name}-${line.headsign}`}
							className="bg-white border border-gray-300 rounded-2xl p-4 transition-all duration-200 hover:border-gray-400 hover:shadow-md">
							{/* Line header */}
							<div className="flex items-center gap-2 mb-3">
								<span className="bg-blue-600 text-white text-sm font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-2">{getTransportIcon(line.routeType)}{line.name}</span>
								<span className="text-sm text-gray-600 font-medium">{line.headsign}</span>
							</div>

							{/* Departure times */}
							<div className="flex flex-wrap gap-2">
								{line.departures.map((departure) => (
									<span
										key={departure.scheduledTime}
										className={`text-sm font-medium px-3 py-1 rounded-xl border transition-colors duration-100
                                        ${departure.realtimeTime ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}>
										{departure.realtimeTime
											? `${departure.realtimeTime}${departure.delayMin !== null ? ` (${departure.delayMin! > 0 ? "+" : ""}${departure.delayMin}min)` : ""}`
											: departure.scheduledTime}
									</span>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="mt-6 text-gray-600 text-sm">Nessuna partenza trovata</div>
			)}
		</div>
	);
}

export default DeparturesPage;
