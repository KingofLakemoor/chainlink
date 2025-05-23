import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { pick_status } from "./schema";
import { calculateSquadLevel, calculateSquadScore } from "./utils";

export const updateSquad = mutation({
  args: {
    _id: v.id("squads"),
    name: v.string(),
    description: v.string(),
    active: v.boolean(),
    featured: v.boolean(),
    open: v.boolean(),
    image: v.string(),
    imageStorageId: v.optional(v.string()),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    //get squad
    const squad = await ctx.db.get(args._id);
    if (!squad) {
      throw new Error("Squad not found");
    }

    if (squad.slug !== args.slug) {
      //check if slug is unique
      const squadWithSameSlug = await ctx.db
        .query("squads")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();
      if (squadWithSameSlug) {
        throw new Error("Slug already exists");
      }
    }

    if (args.imageStorageId) {
      const storageUrl = await ctx.storage.getUrl(args.imageStorageId);
      args.image = storageUrl || "https://chainlink.st/icons/icon-256x256.png";
    }

    return await ctx.db.patch(args._id, {
      name: args.name,
      description: args.description,
      active: args.active,
      featured: args.featured,
      open: args.open,
      image: args.image,
      imageStorageId: args.imageStorageId as Id<"_storage"> | undefined,
      slug: args.slug,
    });
  },
});

export const deleteSquadImage = mutation({
  args: {
    squadId: v.id("squads"),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (args.storageId) {
      await ctx.storage.delete(args.storageId);
    }
    await ctx.db.patch(args.squadId, {
      image: "https://chainlink.st/icons/icon-256x256.png",
      imageStorageId: undefined,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const squads = await ctx.db.query("squads").collect();
    return squads;
  },
});

export const getSquad = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const squad = await ctx.db.get(squadId);
    return squad;
  },
});

export const getSquadBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const squad = await ctx.db
      .query("squads")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return squad;
  },
});

export const getSquadsByScore = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const squads = await ctx.db
      .query("squads")
      .withIndex("by_score")
      .order("desc")
      .take(limit);
    return squads;
  },
});

export const getUserSquad = query({
  args: {},
  handler: async (ctx) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) {
      return null;
    }
    //get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("externalId", auth.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.squadId) {
      return null;
    }
    //get squad
    const squad = await ctx.db.get(user.squadId);
    return squad;
  },
});

export const leaveSquad = mutation({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("externalId", auth.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.squadId) {
      throw new Error("User does not have a squad");
    }

    const squad = await ctx.db.get(user.squadId);
    if (!squad) {
      throw new Error("Squad not found");
    }

    await ctx.db.patch(user.squadId, {
      members: squad.members.filter((member) => member.userId !== user._id),
    });

    await ctx.db.patch(user._id, {
      squadId: undefined,
    });

    return squad;
  },
});

export const joinSquad = mutation({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) {
      return { error: "Unauthorized" };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("externalId", auth.subject))
      .unique();
    if (!user) {
      return { error: "User not found" };
    }
    if (user.squadId) {
      return { error: "You are already in a squad" };
    }

    const squad = await ctx.db.get(squadId);
    if (!squad) {
      return { error: "Squad not found" };
    }

    await ctx.db.patch(squadId, {
      members: [
        ...squad.members,
        {
          userId: user._id,
          role: "MEMBER",
          joinedAt: new Date().getTime(),
          stats: { coins: 0, wins: 0, losses: 0, pushes: 0 },
        },
      ],
    });

    await ctx.db.patch(user._id, {
      squadId: squadId,
    });

    return { data: squad };
  },
});

export const getMostRecentSquads = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const squads = await ctx.db.query("squads").order("desc").take(limit);
    return squads;
  },
});

export const searchSquads = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const squads = await ctx.db
      .query("squads")
      .withSearchIndex("by_name", (q) =>
        q.search("name", query).eq("active", true)
      )
      .take(10);
    return squads;
  },
});

export const createSquad = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    storageId: v.id("_storage"),
    image: v.string(),
    slug: v.string(),
    open: v.boolean(),
  },
  handler: async (ctx, { name, description, storageId, slug, open }) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) {
      return { error: "Unauthorized" };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("externalId", auth.subject))
      .unique();
    if (!user) {
      return { error: "User not found" };
    }
    if (user.squadId) {
      return { error: "User already has a squad" };
    }

    const storageUrl = await ctx.storage.getUrl(storageId);

    const squad = await ctx.db.insert("squads", {
      name,
      description,
      image: storageUrl || "",
      imageStorageId: storageId,
      slug,
      open,
      active: true,
      featured: false,
      ownerId: user._id,
      score: 0,
      rank: 1,
      stats: {
        coins: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        statsByLeague: {},
      },
      members: [
        {
          userId: user._id,
          stats: { coins: 0, wins: 0, losses: 0, pushes: 0 },
          role: "OWNER",
          joinedAt: new Date().getTime(),
        },
      ],
      monthlyStats: {},
    });

    await ctx.db.patch(user._id, {
      squadId: squad,
    });

    return { data: squad };
  },
});

export const generateUploadUrl = mutation({
  args: {
    // ...
  },
  handler: async (ctx, args) => {
    // use `args` and/or `ctx.auth` to authorize the user
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Return an upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

export const handlePickComplete = mutation({
  args: {
    squadId: v.id("squads"),
    userId: v.id("users"),
    pick: v.object({
      _id: v.id("picks"),
      status: pick_status,
      coins: v.number(),
      league: v.string(),
    }),
  },
  handler: async (ctx, { squadId, userId, pick }) => {
    const squad = await ctx.db.get(squadId);
    if (!squad) {
      throw new Error("Squad not found");
    }

    //Calculate new squad score and Level
    const squadScore = calculateSquadScore({
      stats: {
        ...squad.stats,
        coins: squad.stats.coins + pick.coins,
        wins: squad.stats.wins + (pick.status === "WIN" ? 1 : 0),
        losses: squad.stats.losses + (pick.status === "LOSS" ? 1 : 0),
        pushes: squad.stats.pushes + (pick.status === "PUSH" ? 1 : 0),
      },
    });
    const rank = calculateSquadLevel(squadScore);

    //update squad stats
    await ctx.db.patch(squadId, {
      score: squadScore,
      rank: rank.rank,
      members: squad.members.map((member) => {
        if (member.userId === userId) {
          return {
            ...member,
            stats: {
              ...member.stats,
              coins: member.stats.coins + pick.coins,
              wins: member.stats.wins + (pick.status === "WIN" ? 1 : 0),
              losses: member.stats.losses + (pick.status === "LOSS" ? 1 : 0),
              pushes: member.stats.pushes + (pick.status === "PUSH" ? 1 : 0),
            },
          };
        }
        return member;
      }),
      stats: {
        ...squad.stats,
        coins: squad.stats.coins + pick.coins,
        wins: squad.stats.wins + (pick.status === "WIN" ? 1 : 0),
        losses: squad.stats.losses + (pick.status === "LOSS" ? 1 : 0),
        pushes: squad.stats.pushes + (pick.status === "PUSH" ? 1 : 0),
        statsByLeague: {
          ...squad.stats.statsByLeague,
          [pick.league]: {
            wins:
              (squad.stats.statsByLeague[pick.league]?.wins || 0) +
              (pick.status === "WIN" ? 1 : 0),
            losses:
              (squad.stats.statsByLeague[pick.league]?.losses || 0) +
              (pick.status === "LOSS" ? 1 : 0),
            pushes:
              (squad.stats.statsByLeague[pick.league]?.pushes || 0) +
              (pick.status === "PUSH" ? 1 : 0),
          },
        },
      },
    });
  },
});
