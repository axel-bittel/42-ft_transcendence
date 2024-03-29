import { Controller, Post, Get, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              private authService : AuthService) {}
  @UseGuards(AuthGuard('local'))
  @Post('/auth')
  async  login(@Request() req)
  {
      return (this.authService.login(req.user));
  }

  @UseGuards(AuthGuard('oauth'))
  @Post("/auth42")
  async login42(@Request() req)
  {
      if (req.user.error)
          return ({get_code : req.user.error, tmp_jwt: await this.authService.sign_tmp_jwt(req.user.user)});
      else
      {
        return (this.authService.login(req.user));
      }
  }
}

