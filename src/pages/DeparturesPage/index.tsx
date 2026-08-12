import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DepartingLine } from "../../types/index";
import fetchDepartures from "../../services/departuresService";
import { searchStops } from "../../services/searchStops";
import { getTransportIcon } from "../../utils/transportIcon";
import { minutesBetween, REALTIME_WINDOW_MINUTES, formatDateToUrl, parseUrlToDate } from "../../utils/timeHelpers";
import { getRecentStops, addRecentStop } from "../../utils/stopHistory";
import StopSearch from "./components/StopSearch";
import type { StopOption } from "./components/StopSearch";
import DateTimeSelector from "./components/DateTimeSelector";
import { filterDepartingLines, BASE_THRESHOLD_MINUTES, THRESHOLD_STEP_MINUTES, MAX_THRESHOLD_MINUTES } from "./utils/filterDepartingLines";
import { setActiveThreshold } from "../../services/feedbackCapture";

function DeparturesPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const [pendingStop, setPendingStop] = useState<StopOption | null>(null);
	const [pendingDateTime, setPendingDateTime] = useState<Date>(() => new Date());

	const [appliedStop, setAppliedStop] = useState<StopOption | null>(null);
	const [appliedDateTime, setAppliedDateTime] = useState<Date | null>(null);

	const [departingLines, setDepartingLines] = useState<DepartingLine[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [recentStops, setRecentStops] = useState<StopOption[]>(() => getRecentStops());
	const [expandSearch, setExpandSearch] = useState<boolean>(false);

	const requestIdRef = useRef(0);

	// Applica una fermata + datetime risolti come ricerca corrente: aggiorna gli stati
	// pending/applied, registra la fermata nello storico recenti e recupera le partenze.
	const applySearch = async (stopOption: StopOption, date: Date) => {
		const requestId = ++requestIdRef.current;

		setPendingStop(stopOption);
		setAppliedStop(stopOption);
		setAppliedDateTime(date);
		setIsLoading(true);
		setExpandSearch(false);
		setRecentStops(addRecentStop(stopOption));

		const result = await fetchDepartures(stopOption.value, date);

		if (requestIdRef.current === requestId) {
			setDepartingLines(result);
			setIsLoading(false);
		}
	};

	// Inizializza/Sincronizza lo stato dai query param all'avvio
	useEffect(() => {
		const stop = searchParams.get("stop");
		const dateParam = searchParams.get("date");
		const hourParam = searchParams.get("hour");
		const minuteParam = searchParams.get("minute");

		if (!stop) return;

		const parsedDate = parseUrlToDate(dateParam, hourParam, minuteParam) ?? new Date();

		setPendingDateTime(parsedDate);

		// Esegue la ricerca direttamente se i parametri sono presenti nell'URL
		const resolveAndApply = async () => {
			// 1. Recupera i dati completi della fermata
			const searchResults = await searchStops(stop);
			const matchedStop = searchResults.find((s) => s.stopCode === stop);

			// 2. Costruisci la label corretta
			const label = matchedStop ? `${matchedStop.stopCode} – ${matchedStop.readableName}` : stop;

			await applySearch({ value: stop, label }, parsedDate);
		};

		resolveAndApply();
	}, []); // Solo al mount iniziale

	useEffect(() => {
		if (appliedStop) {
			document.title = `Fermata ${appliedStop.label}`;
		} else {
			document.title = "Prossime partenze";
		}
	}, [appliedStop]);

	const canApply = pendingStop !== null && (pendingStop.value !== appliedStop?.value || appliedDateTime === null || pendingDateTime.getTime() !== appliedDateTime.getTime());

	const isCustomDateTime = appliedDateTime !== null && minutesBetween(appliedDateTime, new Date()) > REALTIME_WINDOW_MINUTES;

	const { lines: visibleLines, thresholdMinutes } = useMemo(() => {
		if (!appliedDateTime) return { lines: departingLines, thresholdMinutes: BASE_THRESHOLD_MINUTES };
		const referenceOffsetMinutes = appliedDateTime.getHours() * 60 + appliedDateTime.getMinutes();
		const maxThresholdMinutes = expandSearch ? MAX_THRESHOLD_MINUTES : BASE_THRESHOLD_MINUTES + THRESHOLD_STEP_MINUTES;
		return filterDepartingLines(departingLines, referenceOffsetMinutes, maxThresholdMinutes, expandSearch);
	}, [departingLines, appliedDateTime, expandSearch]);

	const isThresholdExpanded = visibleLines.length > 0 && thresholdMinutes > BASE_THRESHOLD_MINUTES;
	const canLoadMore = !expandSearch && !isLoading && appliedStop !== null && visibleLines.length === 0 && departingLines.length > 0;
	const handleLoadMore = () => setExpandSearch(true);

	useEffect(() => {
		setActiveThreshold(appliedDateTime ? thresholdMinutes : null);
	}, [appliedDateTime, thresholdMinutes]);

	const gttUrl = useMemo(() => {
		if (!appliedStop || !appliedDateTime) return null;
		const { dateStr, hourStr, minuteStr } = formatDateToUrl(appliedDateTime);
		return `https://www.gtt.to.it/cms/percorari/arrivi?option=com_gtt&view=palina&realtime=true&palina=${appliedStop.value}&ora=${hourStr}%3A${minuteStr}&data=${dateStr}`;
	}, [appliedStop, appliedDateTime]);

	const loadOptions = async (query: string): Promise<StopOption[]> => {
		const results = await searchStops(query);
		return results.map((stop) => ({
			value: stop.stopCode,
			label: stop.stopCode + " – " + stop.readableName,
		}));
	};

	const handleStopSelect = (option: StopOption | null) => {
		if (!option) return;
		setPendingStop(option);
	};

	const handleApply = async () => {
		if (!pendingStop) return;

		// Aggiorna la URL
		const { dateStr, hourStr, minuteStr } = formatDateToUrl(pendingDateTime);
		setSearchParams({
			stop: pendingStop.value,
			date: dateStr,
			hour: hourStr,
			minute: minuteStr,
		});

		await applySearch(pendingStop, pendingDateTime);
	};

	const handleResetToNow = () => {
		setPendingDateTime(new Date());
	};

	return (
		<div className="max-w-2xl mx-auto bg-surface px-4 py-8">
			<h1 className="text-header-md font-bold text-foreground mb-6">Prossime partenze</h1>
			<StopSearch value={pendingStop} onSelect={handleStopSelect} onMenuOpen={() => setPendingStop(null)} loadOptions={loadOptions} defaultOptions={recentStops} />
			<DateTimeSelector value={pendingDateTime} onChange={setPendingDateTime} onSubmit={handleApply} onReset={handleResetToNow} />
			<div className="flex justify-between">
				<button
					type="button"
					onClick={handleApply}
					disabled={!canApply}
					className="mt-3 text-caption font-semibold bg-primary text-background px-4 py-2 rounded-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:opacity-90 enabled:hover:scale-[1.03] enabled:active:scale-95">
					Applica
				</button>
				{gttUrl && (
					<a
						href={gttUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 text-caption font-semibold bg-primary text-white px-4 py-2 rounded-md transition-all duration-150 cursor-pointer hover:opacity-90 hover:scale-[1.03] active:scale-95 inline-block">
						Apri GTT
					</a>
				)}
			</div>
			{!isLoading && isThresholdExpanded && (
				<p className="animate-fade-in mt-6 text-caption text-muted bg-background border border-border rounded-md px-3 py-2">
					Nessuna partenza nelle prossime 4 ore: queste sono le prossime partenze programmate.
				</p>
			)}
			{isLoading ? (
				<div className="animate-fade-in mt-6 flex items-center gap-2 text-caption text-muted">
					<span className="inline-block h-4 w-4 rounded-full border-2 border-border border-t-accent animate-spin" />
					Caricamento partenze...
				</div>
			) : visibleLines.length > 0 ? (
				<div className="animate-fade-in mt-6 flex flex-col gap-4">
					{appliedStop && <h2 className="text-header-sm font-semibold text-foreground">{appliedStop.label}</h2>}
					{visibleLines.map((line) => (
						<div
							key={`${line.name}-${line.headsign}`}
							className="bg-background border border-border rounded-lg p-4 transition-[border-color,box-shadow] duration-200 hover:border-accent hover:shadow-light">
							<div className="flex items-center gap-2 mb-2">
								<span className="inline-flex items-center gap-1 bg-primary text-background text-caption font-semibold px-2 py-1 rounded-md">
									{getTransportIcon(line.routeType)}
									{line.name}
								</span>
								<span className="text-caption font-medium text-muted">{line.headsign}</span>
							</div>
							<div className="flex flex-wrap gap-1">
								{line.departures.map((departure) => {
									const showRealtime = !isCustomDateTime && departure.realtimeTime !== null;
									return (
										<span
											key={departure.tripId}
											className={`inline-flex items-center gap-1 text-caption font-medium px-2 py-1 rounded-md border ${
												showRealtime ? "border-success text-success bg-transparent" : "border-border text-muted bg-surface"
											}`}>
											{showRealtime && <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />}
											{showRealtime
												? `${departure.realtimeTime}${departure.delayMin !== null ? ` (${departure.delayMin! > 0 ? "+" : ""}${departure.delayMin}min)` : ""}`
												: departure.scheduledTime}
										</span>
									);
								})}
							</div>
						</div>
					))}
				</div>
			) : appliedStop ? (
				canLoadMore ? (
					<div className="animate-fade-in flex flex-col items-start gap-6">
						<p className="animate-fade-in mt-6 text-caption text-muted bg-background border border-border rounded-md px-3 py-2">
							Nessuna partenza nelle prossime {thresholdMinutes / 60} ore
						</p>
						<button
							type="button"
							onClick={handleLoadMore}
							className="text-caption font-semibold bg-primary text-background px-4 py-2 rounded-md transition-all duration-150 cursor-pointer hover:opacity-90 hover:scale-[1.03] active:scale-95">
							Carica altri
						</button>
					</div>
				) : (
					<p className="animate-fade-in mt-6 text-caption text-muted bg-background border border-border rounded-md px-3 py-2">
						Nessuna partenza trovata
					</p>
				)
			) : null}
		</div>
	);
}

export default DeparturesPage;
