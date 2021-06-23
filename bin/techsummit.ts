#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { TechsummitStack } from '../lib/techsummit-stack';

const app = new cdk.App();
new TechsummitStack(app, 'TechsummitStack');
