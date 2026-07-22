import { Controller, Get } from "@nestjs/common";

@Controller( "user" )
export class UserController {
    @Get()
    getUsers () {
        return [
            {
                id: 1,
                name: "test",
            },
        ];
    }


}
