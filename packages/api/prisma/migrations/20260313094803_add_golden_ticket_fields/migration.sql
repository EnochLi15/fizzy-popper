-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "assignee" TEXT,
    "agentStatus" TEXT,
    "workspaceUrl" TEXT,
    "startTime" DATETIME,
    "agentConfig" TEXT,
    "parentId" TEXT,
    "isGoldenTicket" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("agentConfig", "agentStatus", "assignee", "createdAt", "description", "id", "parentId", "startTime", "status", "title", "updatedAt", "workspaceUrl") SELECT "agentConfig", "agentStatus", "assignee", "createdAt", "description", "id", "parentId", "startTime", "status", "title", "updatedAt", "workspaceUrl" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
