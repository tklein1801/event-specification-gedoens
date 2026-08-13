#!/usr/bin/env node

import { runServer } from './runServer';
import { config } from './appConfig';

void runServer(config);
