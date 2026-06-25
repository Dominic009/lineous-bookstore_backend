import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PublicationModule } from './publication/publication.module';
import { SubjectModule } from './subject/subject.module';
import { BookModule } from './book/book.module';
import { BookPartModule } from './book-part/book-part.module';
import { BookAttachmentModule } from './book-attachment/book-attachment.module';
import { ReviewModule } from './review/review.module';
import { TeacherModule } from './teacher/teacher.module';
import { AddressModule } from './address/address.module';
import { CategoryModule } from './category/category.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { OrderModule } from './order/order.module';
import { BannerModule } from './banner/banner.module';
import { SettingModule } from './setting/setting.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    PublicationModule,
    SubjectModule,
    BookModule,
    BookPartModule,
    BookAttachmentModule,
    ReviewModule,
    TeacherModule,
    AddressModule,
    CategoryModule,
    CartModule,
    WishlistModule,
    OrderModule,
    BannerModule,
    SettingModule,
    AuditLogModule,
    FileUploadModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
