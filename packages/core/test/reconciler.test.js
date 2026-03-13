import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Reconciler } from "../src/reconciler.js";
import { makeCard, makeGoldenTicketCard, makeColumn, makeConfig, makeGoldenTicket } from "./fixtures.js";
// Suppress log output
vi.mock("../src/log.js", () => ({
    header: vi.fn(),
    board: vi.fn(),
    column: vi.fn(),
    agentSpawn: vi.fn(),
    agentStep: vi.fn(),
    agentSuccess: vi.fn(),
    agentError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
    dim: vi.fn(),
}));
function makeMockClient(cards = []) {
    return {
        listBoards: vi.fn(),
        getBoard: vi.fn(),
        listCards: vi.fn().mockResolvedValue(cards),
        listColumns: vi.fn(),
        getCard: vi.fn(),
        listComments: vi.fn(),
        closeCard: vi.fn(),
        triageCard: vi.fn(),
        postComment: vi.fn(),
        toggleTag: vi.fn(),
        getIdentity: vi.fn(),
    };
}
function makeMockRouter() {
    return {
        loadBoardConfigs: vi.fn().mockResolvedValue(undefined),
        findGoldenTicket: vi.fn().mockReturnValue(null),
        routeCardsForReconciliation: vi.fn().mockReturnValue([]),
        getBoardConfigs: vi.fn().mockReturnValue(new Map()),
        routeEvent: vi.fn(),
        loadBoardConfig: vi.fn(),
    };
}
function makeMockSupervisor() {
    return {
        activeCardIds: vi.fn().mockReturnValue(new Set()),
        spawn: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn(),
        cancelOrphans: vi.fn(),
        isRunning: vi.fn().mockReturnValue(false),
        activeCount: vi.fn().mockReturnValue(0),
        atCapacity: vi.fn().mockReturnValue(false),
        getActiveRuns: vi.fn().mockReturnValue([]),
        getRecentRuns: vi.fn().mockReturnValue([]),
    };
}
describe("Reconciler", () => {
    let reconciler;
    let client;
    let router;
    let supervisor;
    beforeEach(() => {
        vi.useFakeTimers();
        client = makeMockClient();
        router = makeMockRouter();
        supervisor = makeMockSupervisor();
    });
    afterEach(() => {
        reconciler?.stop();
        vi.useRealTimers();
    });
    it("runs a tick immediately on start", async () => {
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, ["board-1"]);
        reconciler.start();
        // loadBoardConfigs called immediately
        expect(router.loadBoardConfigs).toHaveBeenCalledWith(["board-1"]);
    });
    it("passes undefined when boardIds is empty", async () => {
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, []);
        reconciler.start();
        expect(router.loadBoardConfigs).toHaveBeenCalledWith(undefined);
    });
    it("runs ticks on interval", async () => {
        const config = makeConfig({ polling: { interval: 5000 } });
        reconciler = new Reconciler(config, client, router, supervisor, ["board-1"]);
        reconciler.start();
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(1);
        // Wait for next tick + flush promises
        await vi.advanceTimersByTimeAsync(5000);
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(5000);
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(3);
    });
    it("stops the interval", async () => {
        reconciler = new Reconciler(makeConfig({ polling: { interval: 1000 } }), client, router, supervisor, []);
        reconciler.start();
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(1);
        reconciler.stop();
        await vi.advanceTimersByTimeAsync(5000);
        // Should not have been called again after stop
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(1);
    });
    it("cancels orphaned agents", async () => {
        const goldenCard = makeGoldenTicketCard();
        const workCard = makeCard({ id: "work-1", column: makeColumn({ id: "col-1" }) });
        client = makeMockClient([goldenCard, workCard]);
        router.findGoldenTicket.mockImplementation((card) => {
            if (card.column?.id === "col-1" && !card.tags?.includes("agent-instructions")) {
                return makeGoldenTicket();
            }
            return null;
        });
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, ["board-1"]);
        reconciler.start();
        // Allow async tick to complete
        await vi.advanceTimersByTimeAsync(0);
        expect(supervisor.cancelOrphans).toHaveBeenCalled();
    });
    it("spawns agents for unworked cards found during reconciliation", async () => {
        const goldenCard = makeGoldenTicketCard();
        const workCard = makeCard({ id: "work-1", column: makeColumn({ id: "col-1" }) });
        client = makeMockClient([goldenCard, workCard]);
        const ticket = makeGoldenTicket();
        router.routeCardsForReconciliation.mockReturnValue([
            { type: "spawn", card: workCard, goldenTicket: ticket },
        ]);
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, ["board-1"]);
        reconciler.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(supervisor.spawn).toHaveBeenCalledWith(workCard, ticket);
    });
    it("does not spawn when at capacity", async () => {
        ;
        supervisor.atCapacity.mockReturnValue(true);
        router.routeCardsForReconciliation.mockReturnValue([
            { type: "spawn", card: makeCard(), goldenTicket: makeGoldenTicket() },
        ]);
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, []);
        reconciler.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(supervisor.spawn).not.toHaveBeenCalled();
    });
    it("guards against concurrent ticks", async () => {
        // Make loadBoardConfigs take a while
        let resolveLoad;
        router.loadBoardConfigs.mockImplementation(() => {
            return new Promise(r => { resolveLoad = r; });
        });
        reconciler = new Reconciler(makeConfig({ polling: { interval: 1000 } }), client, router, supervisor, []);
        reconciler.start();
        // First tick is in progress
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(1);
        // Trigger another tick while first is still running
        await vi.advanceTimersByTimeAsync(1000);
        // Second tick should be skipped because first is still running
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(1);
        // Let first tick complete
        resolveLoad();
        await vi.advanceTimersByTimeAsync(0);
        router.loadBoardConfigs.mockResolvedValue(undefined);
        await vi.advanceTimersByTimeAsync(1000);
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(2);
    });
    it("handles errors gracefully without crashing", async () => {
        ;
        router.loadBoardConfigs.mockRejectedValue(new Error("API down"));
        reconciler = new Reconciler(makeConfig({ polling: { interval: 1000 } }), client, router, supervisor, []);
        reconciler.start();
        // Should not throw
        await vi.advanceTimersByTimeAsync(0);
        router.loadBoardConfigs.mockResolvedValue(undefined);
        await vi.advanceTimersByTimeAsync(1000);
        expect(router.loadBoardConfigs).toHaveBeenCalledTimes(2);
    });
    it("passes board_ids to listCards", async () => {
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, ["b1", "b2"]);
        reconciler.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(client.listCards).toHaveBeenCalledWith({ board_ids: ["b1", "b2"] });
    });
    it("calls listCards without board_ids when empty", async () => {
        reconciler = new Reconciler(makeConfig(), client, router, supervisor, []);
        reconciler.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(client.listCards).toHaveBeenCalledWith(undefined);
    });
});
//# sourceMappingURL=reconciler.test.js.map