import { Module } from '@nestjs/common';

import { BitBucketModule } from './bit-bucket/bit-bucket.module';

@Module({
    imports: [BitBucketModule]
})
export class ScmModule {}
