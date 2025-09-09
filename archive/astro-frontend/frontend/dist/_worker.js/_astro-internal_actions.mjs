globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, s as stringType, n as numberType, b as booleanType, r as recordType, a as arrayType } from './chunks/astro/server_BOeqx9Pa.mjs';
import { g as getActionQueryString, a as astroCalledServerError, A as ActionError, d as deserializeActionResult, b as ACTION_QUERY_PARAMS, c as appendForwardSlash } from './chunks/astro-designed-error-pages_BecKpcxA.mjs';
import { d as defineAction } from './chunks/index_M85zie2b.mjs';

const apiContextRoutesSymbol = Symbol.for("context.routes");
const ENCODED_DOT = "%2E";
function toActionProxy(actionCallback = {}, aggregatedPath = "") {
  return new Proxy(actionCallback, {
    get(target, objKey) {
      if (target.hasOwnProperty(objKey) || typeof objKey === "symbol") {
        return target[objKey];
      }
      const path = aggregatedPath + encodeURIComponent(objKey.toString()).replaceAll(".", ENCODED_DOT);
      function action(param) {
        return handleAction(param, path, this);
      }
      Object.assign(action, {
        queryString: getActionQueryString(path),
        toString: () => action.queryString,
        // redefine prototype methods as the object's own property, not the prototype's
        bind: action.bind,
        valueOf: () => action.valueOf,
        // Progressive enhancement info for React.
        $$FORM_ACTION: function() {
          const searchParams = new URLSearchParams(action.toString());
          return {
            method: "POST",
            // `name` creates a hidden input.
            // It's unused by Astro, but we can't turn this off.
            // At least use a name that won't conflict with a user's formData.
            name: "_astroAction",
            action: "?" + searchParams.toString()
          };
        },
        // Note: `orThrow` does not have progressive enhancement info.
        // If you want to throw exceptions,
        //  you must handle those exceptions with client JS.
        async orThrow(param) {
          const { data, error } = await handleAction(param, path, this);
          if (error) throw error;
          return data;
        }
      });
      return toActionProxy(action, path + ".");
    }
  });
}
function getActionPath(action) {
  let path = `${"/".replace(/\/$/, "")}/_actions/${new URLSearchParams(action.toString()).get(ACTION_QUERY_PARAMS.actionName)}`;
  {
    path = appendForwardSlash(path);
  }
  return path;
}
async function handleAction(param, path, context) {
  if (context) {
    const pipeline = Reflect.get(context, apiContextRoutesSymbol);
    if (!pipeline) {
      throw astroCalledServerError();
    }
    const action = await pipeline.getAction(path);
    if (!action) throw new Error(`Action not found: ${path}`);
    return action.bind(context)(param);
  }
  const headers = new Headers();
  headers.set("Accept", "application/json");
  let body = param;
  if (!(body instanceof FormData)) {
    try {
      body = JSON.stringify(param);
    } catch (e) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: `Failed to serialize request body to JSON. Full error: ${e.message}`
      });
    }
    if (body) {
      headers.set("Content-Type", "application/json");
    } else {
      headers.set("Content-Length", "0");
    }
  }
  const rawResult = await fetch(
    getActionPath({
      toString() {
        return getActionQueryString(path);
      }
    }),
    {
      method: "POST",
      body,
      headers
    }
  );
  if (rawResult.status === 204) {
    return deserializeActionResult({ type: "empty", status: 204 });
  }
  return deserializeActionResult({
    type: rawResult.ok ? "data" : "error",
    body: await rawResult.text()
  });
}
toActionProxy();

const server = {
  // Single vote action
  vote: defineAction({
    input: objectType({
      movie_id: numberType(),
      user_name: stringType().min(1),
      vibe: numberType().min(1).max(6),
      seen: booleanType()
    }),
    accept: objectType({
      success: booleanType(),
      message: stringType(),
      vote_id: numberType().optional()
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });
        const result = await response.json();
        return result;
      } catch (error) {
        return {
          success: false,
          message: "Failed to submit vote"
        };
      }
    }
  }),
  // Batch vote action
  batchVote: defineAction({
    input: objectType({
      votes: arrayType(objectType({
        movie_id: numberType(),
        user_name: stringType().min(1),
        vibe: numberType().min(1).max(6),
        seen: booleanType()
      }))
    }),
    accept: objectType({
      success: booleanType(),
      submitted_count: numberType(),
      failed_count: numberType(),
      errors: arrayType(stringType())
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=batchVote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });
        const result = await response.json();
        return result;
      } catch (error) {
        return {
          success: false,
          submitted_count: 0,
          failed_count: input.votes.length,
          errors: ["Failed to submit batch votes"]
        };
      }
    }
  }),
  // Search movies action
  searchMovies: defineAction({
    input: objectType({
      query: stringType().min(1),
      year: numberType().optional(),
      page: numberType().optional().default(1)
    }),
    accept: objectType({
      results: arrayType(objectType({
        id: numberType(),
        title: stringType(),
        release_date: stringType(),
        poster_path: stringType().nullable(),
        overview: stringType().nullable(),
        genre_ids: arrayType(numberType())
      })),
      total_pages: numberType(),
      total_results: numberType(),
      page: numberType()
    }),
    handler: async (input, { request }) => {
      try {
        const params = new URLSearchParams({
          query: input.query,
          ...input.year && { year: input.year.toString() },
          page: input.page.toString()
        });
        const response = await fetch(`${new URL(request.url).origin}/api?action=search&${params}`);
        const result = await response.json();
        return result;
      } catch (error) {
        return {
          results: [],
          total_pages: 0,
          total_results: 0,
          page: 1
        };
      }
    }
  }),
  // List movies action
  listMovies: defineAction({
    input: objectType({}).optional(),
    accept: objectType({
      movies: arrayType(objectType({
        id: numberType(),
        tmdb_id: numberType(),
        title: stringType(),
        year: numberType(),
        poster_path: stringType().nullable(),
        backdrop_path: stringType().nullable(),
        overview: stringType().nullable(),
        release_date: stringType(),
        runtime: numberType().nullable(),
        adult: booleanType(),
        original_language: stringType(),
        original_title: stringType().nullable(),
        popularity: numberType(),
        vote_average: numberType(),
        vote_count: numberType(),
        created_at: stringType(),
        updated_at: numberType()
      }))
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=listMovies`);
        const result = await response.json();
        return result;
      } catch (error) {
        return { movies: [] };
      }
    }
  }),
  // Get movie details action
  getMovieDetails: defineAction({
    input: objectType({
      id: numberType()
    }),
    accept: objectType({
      id: numberType(),
      title: stringType(),
      overview: stringType(),
      release_date: stringType(),
      genres: arrayType(objectType({
        id: numberType(),
        name: stringType()
      })),
      poster_path: stringType().nullable(),
      backdrop_path: stringType().nullable(),
      runtime: numberType().nullable(),
      vote_average: numberType(),
      vote_count: numberType(),
      videos: arrayType(objectType({
        key: stringType(),
        name: stringType(),
        site: stringType(),
        type: stringType(),
        official: booleanType()
      }))
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=movie&id=${input.id}`);
        const result = await response.json();
        return result;
      } catch (error) {
        throw new Error("Failed to fetch movie details");
      }
    }
  }),
  // Update appeal action
  updateAppeal: defineAction({
    input: objectType({}).optional(),
    accept: objectType({
      updated: numberType(),
      total: numberType(),
      movies: recordType(objectType({
        originalAppeal: numberType(),
        visibilityRatio: numberType(),
        visibilityModifier: numberType(),
        finalAppeal: numberType(),
        seenCount: numberType(),
        totalVoters: numberType(),
        totalUniqueVoters: numberType()
      })),
      totalUniqueVoters: numberType()
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=updateAppeal`, {
          method: "POST"
        });
        const result = await response.json();
        return result;
      } catch (error) {
        return {
          updated: 0,
          total: 0,
          movies: {},
          totalUniqueVoters: 0
        };
      }
    }
  }),
  // Debug action
  debug: defineAction({
    input: objectType({}).optional(),
    accept: objectType({
      debug: booleanType(),
      timestamp: numberType(),
      version: stringType()
    }),
    handler: async (input, { request }) => {
      try {
        const response = await fetch(`${new URL(request.url).origin}/api?action=debug`);
        const result = await response.json();
        return result;
      } catch (error) {
        return {
          debug: false,
          timestamp: Date.now(),
          version: "unknown"
        };
      }
    }
  })
};

export { server };
