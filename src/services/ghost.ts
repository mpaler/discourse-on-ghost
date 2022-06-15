import path from 'node:path';
import GhostAdminApi from '@tryghost/admin-api';
import {RequestInit} from 'node-fetch';
import {GhostMemberWithTiers} from '../types/ghost.js';
import {isObject} from '../lib/is-object.js';
import {createFetch} from '../lib/request.js';
import {ghostUrl, ghostApiKey, logGhostRequests} from './config.js';

const fetch = createFetch('ghost', logGhostRequests);

const adminApi = new GhostAdminApi({
	url: ghostUrl,
	key: ghostApiKey,
	version: 'v5.0',
	async makeRequest({url, method, headers, params, data}) {
		if (params && Object.keys(params).length > 0) {
			const parsedUrl = new URL(url);
			parsedUrl.search = new URLSearchParams(params).toString();
			url = parsedUrl.toString();
		}

		const options: RequestInit = {
			method,
			headers,
		};

		if (data && Object.keys(data).length > 0) {
			options.body = JSON.stringify(data);
		}

		const response = await fetch(url, options);

		if (!response.ok) {
			const error = new Error('Unable to make request') as unknown as Record<string, unknown>;

			try {
				error.response = {
					status: response.status,
					data: await response.json(),
				};
			} finally {
				throw error as unknown as Error; // eslint-disable-line no-unsafe-finally
			}
		}

		return response.json();
	},
});

export function getGhostUrl(urlPath: string, hash = ''): string {
	const base = new URL(ghostUrl);
	base.pathname = path.resolve(base.pathname, urlPath);
	base.hash = hash;

	return base.toString();
}

export async function getMember(id: string): Promise<GhostMemberWithTiers | false> {
	try {
		return await adminApi.members.read({id}, {include: 'tiers'}) as unknown as GhostMemberWithTiers;
	} catch (error: unknown) {
		if (isObject(error) && error.type === 'NotFoundError') {
			return false;
		}

		throw error;
	}
}